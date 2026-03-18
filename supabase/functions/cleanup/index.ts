/**
 * cleanup — HTTP adapter (Edge Function).
 *
 * Responsibilities:
 *  1. Authenticate the request (POST only).
 *  2. Call CleanupExpiredSessionsUseCase from the backend core.
 *  3. Return the cleanup statistics.
 *
 * NO business logic here.
 * Trigger: pg_cron, scheduled job, or manual invocation.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { SupabaseMixSessionRepository } from "../_shared/repositories/SupabaseMixSessionRepository.ts";
import { SupabaseRateLimitRepository } from "../_shared/repositories/SupabaseRateLimitRepository.ts";
import { CleanupExpiredSessionsUseCase } from "../../../backend/src/modules/mix-session/application/use-cases/CleanupExpiredSessions.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const useCase = new CleanupExpiredSessionsUseCase(
      new SupabaseMixSessionRepository(supabaseUrl, serviceRoleKey),
      new SupabaseRateLimitRepository(supabaseUrl, serviceRoleKey),
    );

    const result = await useCase.execute();

    logInfo("Cleanup completed", {
      requestId,
      endpoint: "cleanup",
      status: 200,
      latencyMs: Date.now() - startTime,
      expiredSessions: result.expiredSessions,
      deletedRateLimits: result.deletedRateLimits,
    });

    return jsonResponse({
      status: "ok",
      ...result,
      timestamp: new Date().toISOString(),
    }, 200);
  } catch (err) {
    logError("Cleanup failed", { requestId, endpoint: "cleanup", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
