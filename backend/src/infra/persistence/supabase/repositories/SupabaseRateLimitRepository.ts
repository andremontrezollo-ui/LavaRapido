/**
 * SupabaseRateLimitRepository — Node.js implementation.
 *
 * Implements RateLimitRepository using the Supabase JS client (Node.js).
 * Mirrors the schema of the `rate_limits` table.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RateLimitConfig,
  RateLimitRepository,
  RateLimitResult,
} from '../../../../shared/ports/RateLimitRepository.ts';

export class SupabaseRateLimitRepository implements RateLimitRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async check(ipHash: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

    const { count, error } = await this.supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('endpoint', config.endpoint)
      .gte('created_at', windowStart);

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
      .from('rate_limits')
      .insert({ ip_hash: ipHash, endpoint });

    if (error) throw new Error(`Failed to record rate limit: ${error.message}`);
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const { data, error } = await this.supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', cutoff.toISOString())
      .select('ip_hash');

    if (error) throw new Error(`Failed to delete old rate limits: ${error.message}`);
    return data?.length ?? 0;
  }
}
