/**
 * POST /functions/v1/mix-sessions
 * Creates a new mix session. Thin HTTP adapter — delegates to CreateMixSessionUseCase.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { createSupabaseClient } from "../_shared/adapters/supabase-client.factory.ts";
import { SupabaseMixSessionRepository } from "../_shared/adapters/mix-session.repository.ts";
import { SupabaseRateLimitRepository } from "../_shared/adapters/rate-limit.repository.ts";
import { CreateMixSessionUseCase } from "../../../backend/src/modules/mix-session/application/use-cases/create-mix-session.usecase.ts";
import { hashString } from "../../../backend/src/shared/utils/hash.ts";

const RATE_LIMIT = { maxRequests: 10, windowSeconds: 600 };

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

    const count = await rateLimits.countRequests(ipHash, "mix-sessions", RATE_LIMIT.windowSeconds);
    if (count >= RATE_LIMIT.maxRequests) {
      logWarn("Rate limit triggered", { requestId, endpoint: "mix-sessions", rateLimitTriggered: true, status: 429 });
      return rateLimitError(RATE_LIMIT.windowSeconds);
    }

    const sessions = new SupabaseMixSessionRepository(supabase);
    const useCase = new CreateMixSessionUseCase(sessions);
    const result = await useCase.execute({ clientFingerprintHash: ipHash });

    await rateLimits.record(ipHash, "mix-sessions");

    logInfo("Session created", { requestId, endpoint: "mix-sessions", status: 201, latencyMs: Date.now() - startTime });
    return jsonResponse(result, 201);
  } catch (_err) {
    logError("Unexpected error", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
