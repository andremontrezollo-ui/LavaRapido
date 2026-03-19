/**
 * POST /functions/v1/contact
 * Creates a support ticket. Thin HTTP adapter — delegates to CreateContactTicketUseCase.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { createSupabaseClient } from "../_shared/adapters/supabase-client.factory.ts";
import { SupabaseContactRepository } from "../_shared/adapters/contact.repository.ts";
import { SupabaseRateLimitRepository } from "../_shared/adapters/rate-limit.repository.ts";
import { CreateContactTicketUseCase } from "../../../backend/src/modules/contact/application/use-cases/create-contact-ticket.usecase.ts";
import { InvalidContactInputError } from "../../../backend/src/modules/contact/domain/errors/invalid-contact-input.error.ts";
import { hashString } from "../../../backend/src/shared/utils/hash.ts";

const RATE_LIMIT = { maxRequests: 5, windowSeconds: 600 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await hashString(clientIp);

    const supabase = createSupabaseClient();
    const rateLimits = new SupabaseRateLimitRepository(supabase);

    const count = await rateLimits.countRequests(ipHash, "contact", RATE_LIMIT.windowSeconds);
    if (count >= RATE_LIMIT.maxRequests) {
      logWarn("Rate limit triggered", { requestId, endpoint: "contact", rateLimitTriggered: true, status: 429 });
      return rateLimitError(RATE_LIMIT.windowSeconds);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON");
    }

    if (!body || typeof body !== "object") return validationError("Invalid request body");
    const { subject, message, replyContact } = body as Record<string, unknown>;

    const tickets = new SupabaseContactRepository(supabase);
    const useCase = new CreateContactTicketUseCase(tickets);

    const result = await useCase.execute({
      subject: typeof subject === "string" ? subject : "",
      message: typeof message === "string" ? message : "",
      replyContact: typeof replyContact === "string" ? replyContact : undefined,
      ipHash,
    });

    await rateLimits.record(ipHash, "contact");

    logInfo("Ticket created", { requestId, endpoint: "contact", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 201);
  } catch (err) {
    if (err instanceof InvalidContactInputError) {
      return validationError(err.message);
    }
    logError("Unexpected error", { requestId, endpoint: "contact", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
