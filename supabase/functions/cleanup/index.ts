/**
 * POST /functions/v1/cleanup
 * Expires sessions and prunes old rate limits. Thin HTTP adapter — delegates to RunCleanupUseCase.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { createSupabaseClient } from "../_shared/adapters/supabase-client.factory.ts";
import { SupabaseCleanupRepository } from "../_shared/adapters/cleanup.repository.ts";
import { RunCleanupUseCase } from "../../../backend/src/modules/cleanup/application/use-cases/run-cleanup.usecase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const supabase = createSupabaseClient();
    const repo = new SupabaseCleanupRepository(supabase);
    const useCase = new RunCleanupUseCase(repo);
    const result = await useCase.execute();

    logInfo("Cleanup completed", {
      requestId,
      endpoint: "cleanup",
      status: 200,
      latencyMs: Date.now() - startTime,
      expiredSessions: result.expiredSessions,
      deletedRateLimits: result.deletedRateLimits,
    });

    return jsonResponse(result, 200);
  } catch (_err) {
    logError("Cleanup failed", { requestId, endpoint: "cleanup", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
