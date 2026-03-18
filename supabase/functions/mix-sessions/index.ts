/**
 * mix-sessions — HTTP adapter (Edge Function).
 *
 * Responsibilities:
 *  1. Parse the request.
 *  2. Hash the client IP.
 *  3. Call CreateMixSessionUseCase from the backend core.
 *  4. Map use-case errors to HTTP responses.
 *
 * NO business logic here.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { SupabaseMixSessionRepository } from "../_shared/repositories/SupabaseMixSessionRepository.ts";
import { SupabaseRateLimitRepository, hashString } from "../_shared/repositories/SupabaseRateLimitRepository.ts";
import { CreateMixSessionUseCase, CreateMixSessionError } from "../../../backend/src/modules/mix-session/application/use-cases/CreateMixSession.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(clientIp);

    const useCase = new CreateMixSessionUseCase(
      new SupabaseMixSessionRepository(supabaseUrl, serviceRoleKey),
      new SupabaseRateLimitRepository(supabaseUrl, serviceRoleKey),
    );

    const result = await useCase.execute({ ipHash });

    logInfo("Session created", { requestId, endpoint: "mix-sessions", status: 201, latencyMs: Date.now() - startTime });

    return jsonResponse(result, 201);
  } catch (err) {
    if (err instanceof CreateMixSessionError && err.code === "RATE_LIMITED") {
      logWarn("Rate limit triggered", { requestId, endpoint: "mix-sessions", rateLimitTriggered: true, status: 429 });
      return rateLimitError(err.retryAfterSeconds ?? 600);
    }
    logError("Unexpected error", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
