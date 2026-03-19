/**
 * Cleanup Job
 *
 * Deletes expired mix_sessions and old rate_limits records.
 * Triggered via pg_cron or manual invocation.
 *
 * SECURITY: This endpoint is internal-only. It requires a shared secret
 * provided via the Authorization header: `Bearer <CLEANUP_SECRET>`.
 * It intentionally does NOT expose CORS headers — it must never be
 * reachable from browser JavaScript.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse } from "../_shared/security-headers.ts";
import { internalError, methodNotAllowed, unauthorizedError } from "../_shared/error-response.ts";
import { logInfo, logError, logWarn, generateRequestId } from "../_shared/structured-logger.ts";

/** Constant-time string comparison to resist timing attacks. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  // No CORS — this endpoint is not meant to be called from browsers.
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();

  // Authenticate via shared secret to prevent unauthorized invocation.
  const cleanupSecret = Deno.env.get("CLEANUP_SECRET");
  if (!cleanupSecret) {
    logError("CLEANUP_SECRET not configured", { requestId, endpoint: "cleanup", status: 500 });
    return internalError();
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const parts = authHeader.split(" ");
  const token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : "";

  if (!constantTimeEqual(token, cleanupSecret)) {
    logWarn("Unauthorized cleanup attempt", { requestId, endpoint: "cleanup", status: 401 });
    return unauthorizedError();
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // 1. Mark expired sessions
    const { count: expiredSessions } = await supabase
      .from("mix_sessions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now)
      .select("*", { count: "exact", head: true });

    // 2. Delete rate limit records older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: deletedRateLimits } = await supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", oneHourAgo)
      .select("*", { count: "exact", head: true });

    logInfo("Cleanup completed", {
      requestId,
      endpoint: "cleanup",
      status: 200,
      latencyMs: Date.now() - startTime,
      expiredSessions: expiredSessions ?? 0,
      deletedRateLimits: deletedRateLimits ?? 0,
    });

    return jsonResponse({
      status: "ok",
      expiredSessions: expiredSessions ?? 0,
      deletedRateLimits: deletedRateLimits ?? 0,
      timestamp: new Date().toISOString(),
    }, 200);
  } catch (err) {
    logError("Cleanup failed", { requestId, endpoint: "cleanup", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
