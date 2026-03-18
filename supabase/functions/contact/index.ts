/**
 * contact Edge Function — thin HTTP adapter
 *
 * POST /functions/v1/contact
 * Validates and submits a contact support ticket.
 *
 * Business logic lives in: backend/src/modules/contact/application/use-cases/submit-contact-message.usecase.ts
 * Supabase adapter wired in: supabase/functions/_shared/container.ts
 */

import { corsResponse } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/response.ts";
import { errors } from "../_shared/errors.ts";
import { telemetry } from "../_shared/telemetry.ts";
import { extractClientIp, parseJsonBody, generateRequestId } from "../_shared/request.ts";
import { getContainer } from "../_shared/container.ts";

const RATE_LIMIT = { endpoint: "contact", maxRequests: 5, windowSeconds: 600 };

const VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
};

function validateContactPayload(body: unknown):
  | { valid: true; data: { subject: string; message: string; replyContact?: string } }
  | { valid: false; error: string } {
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
      subject: subject as string,
      message: message as string,
      replyContact: typeof replyContact === "string" ? replyContact : undefined,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return errors.methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();
  const container = getContainer();

  try {
    const clientIp = extractClientIp(req);
    const ipHash = await container.hashString(clientIp);

    // Rate limiting
    const rl = await container.checkRateLimit(ipHash, RATE_LIMIT);
    if (!rl.allowed) {
      telemetry.warn("Rate limit triggered", { requestId, endpoint: "contact", rateLimitTriggered: true, status: 429 });
      return errors.rateLimit(rl.retryAfterSeconds);
    }

    const body = await parseJsonBody(req);
    if (!body) return errors.validation("Invalid JSON");

    const validation = validateContactPayload(body);
    if (!validation.valid) return errors.validation(validation.error);

    await container.recordRateLimit(ipHash, RATE_LIMIT.endpoint);

    // Delegate to use case
    const result = await container.submitContactMessage({
      subject: validation.data.subject,
      message: validation.data.message,
      replyContact: validation.data.replyContact,
      ipHash,
    });

    telemetry.info("Ticket created", { requestId, endpoint: "contact", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 201);
  } catch {
    telemetry.error("Unexpected error", { requestId, endpoint: "contact", status: 500, latencyMs: Date.now() - startTime });
    return errors.internal();
  }
});
