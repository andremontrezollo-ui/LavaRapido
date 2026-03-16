/**
 * Reusable Rate Limiter for Edge Functions
 *
 * Uses HMAC-SHA256 with a server secret (RATE_LIMIT_HMAC_SECRET env var)
 * to pseudonymise IP addresses before storing them.
 * Falls back to a plain SHA-256 if the secret is not configured (with a warning).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  ipHash: string,
  config: RateLimitConfig,
  supabase: ReturnType<typeof createClient>
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("endpoint", config.endpoint)
    .gte("created_at", windowStart);

  const current = count ?? 0;
  const allowed = current < config.maxRequests;

  return {
    allowed,
    count: current,
    remaining: Math.max(0, config.maxRequests - current),
    retryAfterSeconds: allowed ? 0 : config.windowSeconds,
  };
}

export async function recordRateLimit(
  ipHash: string,
  endpoint: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  await supabase.from("rate_limits").insert({ ip_hash: ipHash, endpoint });
}

/**
 * Derives a pseudonymous hash from an IP address.
 * Uses HMAC-SHA256 with RATE_LIMIT_HMAC_SECRET when available,
 * otherwise falls back to plain SHA-256 (less secure — configure the secret).
 */
export async function hashIp(ip: string): Promise<string> {
  const secret = Deno.env.get("RATE_LIMIT_HMAC_SECRET");
  const encoder = new TextEncoder();

  if (secret) {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback: plain SHA-256 (less private — set RATE_LIMIT_HMAC_SECRET in env)
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(ip));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
