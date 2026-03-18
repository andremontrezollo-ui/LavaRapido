/**
 * contact — HTTP adapter (Edge Function).
 *
 * Responsibilities:
 *  1. Parse the request body.
 *  2. Hash the client IP.
 *  3. Call SubmitContactMessageUseCase from the backend core.
 *  4. Map use-case errors to HTTP responses.
 *
 * NO business logic here.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { SupabaseContactRepository } from "../_shared/repositories/SupabaseContactRepository.ts";
import { SupabaseRateLimitRepository, hashString } from "../_shared/repositories/SupabaseRateLimitRepository.ts";
import { SubmitContactMessageUseCase, SubmitContactMessageError } from "../../../backend/src/modules/contact/application/use-cases/SubmitContactMessage.ts";

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

    if (!body || typeof body !== "object") return validationError("Invalid request body");
    const { subject, message, replyContact } = body as Record<string, unknown>;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const useCase = new SubmitContactMessageUseCase(
      new SupabaseContactRepository(supabaseUrl, serviceRoleKey),
      new SupabaseRateLimitRepository(supabaseUrl, serviceRoleKey),
    );

    const result = await useCase.execute({ ipHash, subject, message, replyContact });

    logInfo("Ticket created", { requestId, endpoint: "contact", status: 201, latencyMs: Date.now() - startTime });

    return jsonResponse(result, 201);
  } catch (err) {
    if (err instanceof SubmitContactMessageError) {
      if (err.code === "RATE_LIMITED") {
        logWarn("Rate limit triggered", { requestId, endpoint: "contact", rateLimitTriggered: true, status: 429 });
        return rateLimitError(err.retryAfterSeconds ?? 600);
      }
      if (err.code === "VALIDATION_ERROR") return validationError(err.message);
    }
    logError("Unexpected error", { requestId, endpoint: "contact", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
