/**
 * Mix Session Status Lookup
 * POST /functions/v1/mix-session-status
 * Body: { statusToken: "<64-char hex opaque token>" }
 *
 * Accepts only the opaque public_status_token (never the internal UUID).
 * Returns minimal fields: status and expiry timestamps only.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { validationError, notFoundError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { logInfo, logError, generateRequestId } from "../_shared/structured-logger.ts";

/** Opaque status token: 64 hex characters (32 random bytes). */
const STATUS_TOKEN_RE = /^[0-9a-f]{64}$/i;

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin");
  if (req.method === "OPTIONS") return corsResponse(requestOrigin);
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
    const { statusToken } = body as Record<string, unknown>;

    if (typeof statusToken !== "string" || !STATUS_TOKEN_RE.test(statusToken)) {
      return validationError("Invalid status token format.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("mix_sessions")
      .select("status, expires_at, created_at")
      .eq("public_status_token", statusToken)
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
        .eq("public_status_token", statusToken);
    }

    logInfo("Session status queried", { requestId, endpoint: "mix-session-status", status: 200, latencyMs: Date.now() - startTime });

    // Return minimal fields only — no internal IDs
    return jsonResponse({
      status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    }, 200, undefined, requestOrigin);
  } catch (err) {
    logError("Unexpected error", { requestId, endpoint: "mix-session-status", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
