/**
 * Contact — HTTP Entry Point
 * POST /functions/v1/contact
 *
 * Parses the request, extracts IP, then delegates to the
 * CreateContactTicket use case. All business logic (validation,
 * sanitization, ticket generation, rate limiting) lives in
 * _shared/use-cases/create-contact-ticket.usecase.ts.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { hashString } from "../_shared/rate-limiter.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { createContactTicketUseCase } from "../_shared/use-cases/create-contact-ticket.usecase.ts";
import { createSupabaseContactRepository } from "../_shared/adapters/supabase-contact.adapter.ts";
import { createSupabaseRateLimitRepository } from "../_shared/adapters/supabase-rate-limit.adapter.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(clientIp);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await createContactTicketUseCase(
      { ipHash, body },
      createSupabaseContactRepository(supabase),
      createSupabaseRateLimitRepository(supabase),
    );

    if (!result.allowed) {
      logWarn("Rate limit triggered", { requestId, endpoint: "contact", rateLimitTriggered: true, status: 429 });
      return rateLimitError(result.retryAfterSeconds);
    }

    if (result.validationError) {
      return validationError(result.validationError);
    }

    logInfo("Ticket created", { requestId, endpoint: "contact", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result.ticket, 201);
  } catch {
    logError("Unexpected error", { requestId, endpoint: "contact", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
