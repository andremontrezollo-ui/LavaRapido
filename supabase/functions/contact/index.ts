import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, rateLimitError, internalError, methodNotAllowed, ErrorCodes } from "../_shared/error-response.ts";
import { checkRateLimit, recordRateLimit, hashString } from "../_shared/rate-limiter.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";

// Business logic delegated to the CORE backend module.
import {
  validateContactPayload,
  generateTicketId,
} from "../../../backend/src/modules/contact/domain/index.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(clientIp);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 5 tickets per 10 minutes per IP
    const rl = await checkRateLimit(ipHash, { endpoint: "contact", maxRequests: 5, windowSeconds: 600 }, supabase);

    if (!rl.allowed) {
      logWarn("Rate limit triggered", { requestId, endpoint: "contact", rateLimitTriggered: true, status: 429 });
      return rateLimitError(rl.retryAfterSeconds);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON");
    }

    // Core domain logic: validation and sanitization come from backend/src
    const validation = validateContactPayload(body);
    if (!validation.valid) {
      return validationError(validation.error);
    }

    await recordRateLimit(ipHash, "contact", supabase);

    // Core domain logic: ticket ID generation comes from backend/src
    const ticketId = generateTicketId();

    const { data, error } = await supabase
      .from("contact_tickets")
      .insert({
        ticket_id: ticketId,
        subject: validation.data.subject,
        message: validation.data.message,
        reply_contact: validation.data.replyContact || null,
        ip_hash: ipHash,
      })
      .select("ticket_id, created_at")
      .single();

    if (error) {
      logError("DB error creating ticket", { requestId, endpoint: "contact", status: 500, latencyMs: Date.now() - startTime });
      return internalError();
    }

    logInfo("Ticket created", { requestId, endpoint: "contact", status: 201, latencyMs: Date.now() - startTime });

    return jsonResponse({ ticketId: data.ticket_id, createdAt: data.created_at }, 201);
  } catch (err) {
    logError("Unexpected error", { requestId, endpoint: "contact", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
