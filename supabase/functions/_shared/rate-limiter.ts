/**
 * Rate-limiter helpers for Edge Functions.
 *
 * For rate-limit storage, use SupabaseRateLimitRepository from:
 *   ./_shared/adapters/rate-limit.repository.ts
 *
 * The functions below are kept for backward compatibility with the test file.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashString } from "../../../backend/src/shared/utils/hash.ts";

export type { RateLimitRepositoryPort } from "../../../backend/src/shared/ports/RateLimitRepository.ts";
export { hashString };

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
  supabase: ReturnType<typeof createClient>,
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
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  await supabase.from("rate_limits").insert({ ip_hash: ipHash, endpoint });
}
