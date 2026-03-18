/**
 * SupabaseRateLimitRepository — Supabase implementation of RateLimitRepository.
 */
import type { RateLimitRepository, RateLimitConfig, RateLimitResult } from '../../../modules/mix-session/application/ports/rate-limit-repository.port.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class SupabaseRateLimitRepository implements RateLimitRepository {
  constructor(private readonly client: SupabaseClient) {}

  async check(ipHash: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

    const { count } = await this.client
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('endpoint', config.endpoint)
      .gte('created_at', windowStart);

    const current = count ?? 0;
    const allowed = current < config.maxRequests;

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - current),
      retryAfterSeconds: allowed ? 0 : config.windowSeconds,
    };
  }

  async record(ipHash: string, endpoint: string): Promise<void> {
    await this.client.from('rate_limits').insert({ ip_hash: ipHash, endpoint });
  }

  async deleteOlderThan(before: Date): Promise<number> {
    const { count } = await this.client
      .from('rate_limits')
      .delete()
      .lt('created_at', before.toISOString())
      .select('*', { count: 'exact', head: true });

    return count ?? 0;
  }
}
