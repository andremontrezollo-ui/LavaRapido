import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsResponse } from "../_shared/security-headers.ts";
import { rateLimitError, internalError, methodNotAllowed } from "../_shared/error-response.ts";
import { checkRateLimit, recordRateLimit, hashIp } from "../_shared/rate-limiter.ts";
import { logInfo, logWarn, logError, generateRequestId } from "../_shared/structured-logger.ts";

const TESTNET_CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz";

function generateMockTestnetAddress(): string {
  const body = new Uint8Array(38);
  crypto.getRandomValues(body);
  const encoded = Array.from(body, (b) => TESTNET_CHARSET[b % TESTNET_CHARSET.length]).join("");
  return `tb1q${encoded.slice(0, 38)}`;
}

/** Generates a 32-byte cryptographically random hex token for opaque status lookup. */
function generateStatusToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin");
  if (req.method === "OPTIONS") return corsResponse(requestOrigin);
  if (req.method !== "POST") return methodNotAllowed();

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashIp(clientIp);

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

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    const depositAddress = generateMockTestnetAddress();
    const statusToken = generateStatusToken();

    const { data, error } = await supabase
      .from("mix_sessions")
      .insert({
        deposit_address: depositAddress,
        status: "active",
        expires_at: expiresAt.toISOString(),
        client_fingerprint_hash: ipHash,
        public_status_token: statusToken,
      })
      .select("id, deposit_address, public_status_token, created_at, expires_at, status")
      .single();

    if (error) {
      logError("DB error creating session", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
      return internalError();
    }

    logInfo("Session created", { requestId, endpoint: "mix-sessions", status: 201, latencyMs: Date.now() - startTime });

    return jsonResponse({
      sessionId: data.id,
      statusToken: data.public_status_token,
      depositAddress: data.deposit_address,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      status: data.status,
    }, 201, undefined, requestOrigin);
  } catch (err) {
    logError("Unexpected error", { requestId, endpoint: "mix-sessions", status: 500, latencyMs: Date.now() - startTime });
    return internalError();
  }
});
