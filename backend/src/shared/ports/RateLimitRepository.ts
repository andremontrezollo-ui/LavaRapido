/**
 * RateLimitRepository — port for rate limiting persistence.
 *
 * Implementations live in infra/persistence/supabase/ (Node.js)
 * and in supabase/functions/_shared/repositories/ (Deno).
 */

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

export interface RateLimitRepository {
  /**
   * Check whether the given IP hash has exceeded the limit for the endpoint.
   */
  check(ipHash: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Record a new request for the given IP hash and endpoint.
   */
  record(ipHash: string, endpoint: string): Promise<void>;

  /**
   * Delete all rate-limit records created before the given cutoff date.
   * Returns the number of records deleted.
   */
  deleteOlderThan(cutoff: Date): Promise<number>;
}
