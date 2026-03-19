/**
 * Mix Session Status Lookup
 * POST /functions/v1/mix-session-status
 * Body: { sessionId: "uuid" }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, notFoundError, internalError, methodNotAllowed, rateLimitError } from "../_shared/error-response.ts";
import { checkRateLimit, recordRateLimit, hashString } from "../_shared/rate-limiter.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(clientIp);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 30 status lookups per 10 minutes per IP
    const rl = await checkRateLimit(ipHash, { endpoint: "mix-session-status", maxRequests: 30, windowSeconds: 600 }, supabase);

    if (!rl.allowed) {
      logWarn("Rate limit triggered", { requestId, endpoint: "mix-session-status", rateLimitTriggered: true, status: 429 });
      return rateLimitError(rl.retryAfterSeconds);
    }

    await recordRateLimit(ipHash, "mix-session-status", supabase);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("Invalid JSON");
    }

    if (!body || typeof body !== "object") return validationError("Invalid request body");
    const { sessionId } = body as Record<string, unknown>;

    if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
      return validationError("Invalid session ID format. Must be a valid UUID.");
    }

    const { data, error } = await supabase
      .from("mix_sessions")
      .select("id, status, expires_at, created_at")
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      logInfo("Session not found", { requestId, endpoint: "mix-session-status", status: 404, latencyMs: Date.now() - startTime });
      return notFoundError("Session not found");
    }

    // Check if expired
    const isExpired = new Date(data.expires_at) < new Date();
    const status = isExpired ? "expired" : data.status;

    // Update status in DB if expired
    if (isExpired && data.status !== "expired") {
      await supabase
        .from("mix_sessions")
        .update({ status: "expired" })
        .eq("id", sessionId);
    }

    logInfo("Session status queried", { requestId, endpoint: "mix-session-status", status: 200, latencyMs: Date.now() - startTime });

    return jsonResponse({
      sessionId: data.id,
      status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    }, 200);
  } catch (err) {
    logError("Unexpected error", { requestId, endpoint: "mix-session-status", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
