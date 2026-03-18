/**
 * RateLimitRepository — port for tracking and checking request rate limits.
 */
export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitRepository {
  check(ipHash: string, config: RateLimitConfig): Promise<RateLimitResult>;
  record(ipHash: string, endpoint: string): Promise<void>;
  deleteOlderThan(before: Date): Promise<number>;
}
