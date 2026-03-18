/**
 * SupabaseRateLimitRepository — Deno implementation.
 *
 * Implements the RateLimitRepository port using the Supabase Deno client.
 * Shared by all Edge Functions that need rate limiting.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  RateLimitConfig,
  RateLimitRepository,
  RateLimitResult,
} from "../../../backend/src/shared/ports/RateLimitRepository.ts";

export class SupabaseRateLimitRepository implements RateLimitRepository {
  private readonly supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, serviceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async check(ipHash: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

    const { count, error } = await this.supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("endpoint", config.endpoint)
      .gte("created_at", windowStart);

    if (error) throw new Error(`Rate limit check failed: ${error.message}`);

    const current = count ?? 0;
    const allowed = current < config.maxRequests;

    return {
      allowed,
      count: current,
      remaining: Math.max(0, config.maxRequests - current),
      retryAfterSeconds: allowed ? 0 : config.windowSeconds,
    };
  }

  async record(ipHash: string, endpoint: string): Promise<void> {
    const { error } = await this.supabase
      .from("rate_limits")
      .insert({ ip_hash: ipHash, endpoint });

    if (error) throw new Error(`Failed to record rate limit: ${error.message}`);
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const { count, error } = await this.supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", cutoff.toISOString())
      .select("*", { count: "exact", head: true });

    if (error) throw new Error(`Failed to delete old rate limits: ${error.message}`);
    return count ?? 0;
  }
}

/**
 * Compute the SHA-256 hex digest of a string.
 * Compatible with Deno and Node.js 15+ (Web Crypto API).
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
