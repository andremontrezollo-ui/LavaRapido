import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { checkRateLimit, recordRateLimit, hashString } from "../_shared/rate-limiter.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";

// Business logic delegated to the CORE backend module.
import {
  generateDepositAddress,
  getSessionExpiresAt,
} from "../../../backend/src/modules/mix-session/domain/index.ts";

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

    // Rate limit: max 10 sessions per 10 minutes per IP
    const rl = await checkRateLimit(ipHash, { endpoint: "mix-sessions", maxRequests: 10, windowSeconds: 600 }, supabase);

    if (!rl.allowed) {
      logWarn("Rate limit triggered", { requestId, endpoint: "mix-sessions", rateLimitTriggered: true, status: 429 });
      return rateLimitError(rl.retryAfterSeconds);
    }

    await recordRateLimit(ipHash, "mix-sessions", supabase);

    // Core domain logic: address generation and session TTL come from backend/src
    const now = new Date();
    const expiresAt = getSessionExpiresAt(now);
    const depositAddress = generateDepositAddress("testnet");

    const { data, error } = await supabase
      .from("mix_sessions")
      .insert({
        deposit_address: depositAddress,
        status: "active",
        expires_at: expiresAt.toISOString(),
        client_fingerprint_hash: ipHash,
      })
      .select("id, deposit_address, created_at, expires_at, status")
      .single();

    if (error) {
      logError("DB error creating session", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
      return internalError();
    }

    logInfo("Session created", { requestId, endpoint: "mix-sessions", status: 201, latencyMs: Date.now() - startTime });

    return jsonResponse({
      sessionId: data.id,
      depositAddress: data.deposit_address,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      status: data.status,
    }, 201);
  } catch (err) {
    logError("Unexpected error", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
