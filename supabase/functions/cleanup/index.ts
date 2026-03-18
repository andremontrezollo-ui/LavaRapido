/**
 * cleanup Edge Function — thin HTTP adapter
 *
 * POST /functions/v1/cleanup
 * Marks expired mix_sessions and deletes stale rate_limit records.
 * Triggered via pg_cron or manual invocation.
 *
 * Business logic lives in: backend/src/modules/mix-session/application/use-cases/cleanup-expired-sessions.usecase.ts
 * Supabase adapter wired in: supabase/functions/_shared/container.ts
 */

import { corsResponse } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/response.ts";
import { errors } from "../_shared/errors.ts";
import { telemetry } from "../_shared/telemetry.ts";
import { generateRequestId } from "../_shared/request.ts";
import { getContainer } from "../_shared/container.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return errors.methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();
  const container = getContainer();

  try {
    // Delegate to use case
    const result = await container.cleanupExpiredSessions();

    telemetry.info("Cleanup completed", {
      requestId,
      endpoint: "cleanup",
      status: 200,
      latencyMs: Date.now() - startTime,
      expiredSessions: result.expiredSessions,
      deletedRateLimits: result.deletedRateLimits,
    });

    return jsonResponse({ status: "ok", ...result }, 200);
  } catch {
    telemetry.error("Cleanup failed", { requestId, endpoint: "cleanup", status: 500, latencyMs: Date.now() - startTime });
    return errors.internal();
  }
});
