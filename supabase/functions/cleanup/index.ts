/**
 * Cleanup Job
 * 
 * Deletes expired mix_sessions and old rate_limits/contact_tickets records.
 * Triggered via pg_cron or manual invocation.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin");
  if (req.method === "OPTIONS") return corsResponse(requestOrigin);
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
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

    // 2. Delete mix_sessions older than 24 hours (demo data retention)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: deletedSessions } = await supabase
      .from("mix_sessions")
      .delete()
      .lt("created_at", oneDayAgo)
      .select("*", { count: "exact", head: true });

    // 3. Delete rate limit records older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: deletedRateLimits } = await supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", oneHourAgo)
      .select("*", { count: "exact", head: true });

    // 4. Delete contact_tickets older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: deletedTickets } = await supabase
      .from("contact_tickets")
      .delete()
      .lt("created_at", sevenDaysAgo)
      .select("*", { count: "exact", head: true });

    logInfo("Cleanup completed", {
      requestId,
      endpoint: "cleanup",
      status: 200,
      latencyMs: Date.now() - startTime,
      expiredSessions: expiredSessions ?? 0,
      deletedSessions: deletedSessions ?? 0,
      deletedRateLimits: deletedRateLimits ?? 0,
      deletedTickets: deletedTickets ?? 0,
    });

    return jsonResponse({
      status: "ok",
      expiredSessions: expiredSessions ?? 0,
      deletedSessions: deletedSessions ?? 0,
      deletedRateLimits: deletedRateLimits ?? 0,
      deletedTickets: deletedTickets ?? 0,
      timestamp: new Date().toISOString(),
    }, 200, undefined, requestOrigin);
  } catch (err) {
    logError("Cleanup failed", { requestId, endpoint: "cleanup", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
