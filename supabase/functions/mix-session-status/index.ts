/**
 * Mix Session Status Lookup
 * POST /functions/v1/mix-session-status
 * Body: { sessionId: "uuid" }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, notFoundError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";

// Session expiry logic delegated to the CORE backend module.
import { isSessionExpired } from "../../../backend/src/modules/mix-session/domain/index.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("mix_sessions")
      .select("id, status, expires_at, created_at")
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      logInfo("Session not found", { requestId, endpoint: "mix-session-status", status: 404, latencyMs: Date.now() - startTime });
      return notFoundError("Session not found");
    }

    // Core domain logic: expiry check delegated to backend/src
    const expired = isSessionExpired(data.expires_at);
    const status = expired ? "expired" : data.status;

    // Persist updated status if it just expired
    if (expired && data.status !== "expired") {
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
