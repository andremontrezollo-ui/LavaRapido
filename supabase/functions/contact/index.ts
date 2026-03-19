/**
 * @deprecated EDGE FUNCTION DEPRECATED — DO NOT ADD NEW LOGIC HERE.
 *
 * This function has been superseded by the Express/Node.js backend:
 *   POST /api/v1/contact
 *
 * This file remains only as a temporary fallback during ETAPA 3 of the
 * architectural migration. It will be removed in ETAPA 6.
 *
 * See ARCHITECTURE.md — Section 4: Plano de Migração, ETAPA 6.
 *
 * The canonical implementation now lives at:
 *   backend/src/api/routes/contact.route.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, rateLimitError, internalError, methodNotAllowed, errorResponse, ErrorCodes } from "../_shared/error-response.ts";
import { checkRateLimit, recordRateLimit, hashString } from "../_shared/rate-limiter.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";

const VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
};

function sanitizeInput(input: string): string {
  return input.trim().replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\s{3,}/g, "  ");
}

function generateTicketId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return "TKT-" + Array.from(array, (b) => chars[b % chars.length]).join("");
}

function validatePayload(body: unknown): { valid: true; data: { subject: string; message: string; replyContact: string } } | { valid: false; error: string } {
  if (!body || typeof body !== "object") return { valid: false, error: "Invalid request body" };
  const { subject, message, replyContact } = body as Record<string, unknown>;

  if (typeof subject !== "string" || subject.trim().length < VALIDATION.subject.min || subject.trim().length > VALIDATION.subject.max) {
    return { valid: false, error: `Subject must be ${VALIDATION.subject.min}-${VALIDATION.subject.max} characters` };
  }
  if (typeof message !== "string" || message.trim().length < VALIDATION.message.min || message.trim().length > VALIDATION.message.max) {
    return { valid: false, error: `Message must be ${VALIDATION.message.min}-${VALIDATION.message.max} characters` };
  }
  if (replyContact !== undefined && replyContact !== "" && typeof replyContact === "string" && replyContact.length > VALIDATION.replyContact.max) {
    return { valid: false, error: `Reply contact must be under ${VALIDATION.replyContact.max} characters` };
  }

  return {
    valid: true,
    data: {
      subject: sanitizeInput(subject as string),
      message: sanitizeInput(message as string),
      replyContact: typeof replyContact === "string" ? sanitizeInput(replyContact) : "",
    },
  };
}

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

    const validation = validatePayload(body);
    if (!validation.valid) {
      return validationError(validation.error);
    }

    await recordRateLimit(ipHash, "contact", supabase);

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
