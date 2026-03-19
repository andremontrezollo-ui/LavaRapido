/**
 * Port: RateLimitRepository
 * Abstracts rate-limit record persistence and cleanup.
 */

export interface RateLimitRepository {
  count(ipHash: string, endpoint: string, windowStart: string): Promise<number>;
  record(ipHash: string, endpoint: string): Promise<void>;
  deleteOlderThan(before: string): Promise<number>;
}
