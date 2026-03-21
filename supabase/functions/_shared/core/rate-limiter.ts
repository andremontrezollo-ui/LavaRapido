/**
 * Reusable Rate Limiter for Edge Functions
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

export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
