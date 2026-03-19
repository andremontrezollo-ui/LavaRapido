/**
 * Rate-limit repository port.
 * Abstracts the storage used for IP-based rate limiting.
 */
export interface RateLimitRepositoryPort {
  /** Returns the number of requests recorded for this IP/endpoint in the current window. */
  countRequests(ipHash: string, endpoint: string, windowSeconds: number): Promise<number>;

  /** Records a new request for this IP/endpoint. */
  record(ipHash: string, endpoint: string): Promise<void>;

  /** Deletes all records older than the given cutoff timestamp (ISO string). */
  deleteOlderThan(cutoffIso: string): Promise<number>;
}
