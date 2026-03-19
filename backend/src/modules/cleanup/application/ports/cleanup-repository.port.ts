export interface CleanupRepositoryPort {
  /** Marks all active sessions that have passed their expiry as 'expired'. Returns the count updated. */
  expireActiveSessions(nowIso: string): Promise<number>;

  /** Deletes rate_limit records older than the given cutoff. Returns the count deleted. */
  deleteOldRateLimits(cutoffIso: string): Promise<number>;
}
