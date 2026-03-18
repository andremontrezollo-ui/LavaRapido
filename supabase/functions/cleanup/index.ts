/**
 * Cleanup Job
 *
 * Marks expired mix_sessions and deletes old rate_limit records.
 * Triggered via pg_cron or manual invocation.
 */

import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";
import { container } from "../../../backend/src/bootstrap/container.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const result = await container.cleanupExpiredSessions.execute();

    logInfo("Cleanup completed", {
      requestId,
      endpoint: "cleanup",
      status: 200,
      latencyMs: Date.now() - startTime,
      expiredSessions: result.expiredSessions,
      deletedRateLimits: result.deletedRateLimits,
    });

    return jsonResponse({ status: "ok", ...result, timestamp: new Date().toISOString() }, 200);
  } catch (err) {
    logError("Cleanup failed", { requestId, endpoint: "cleanup", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
