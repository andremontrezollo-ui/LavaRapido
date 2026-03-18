/**
 * CleanupExpiredSessions — use case.
 *
 * Business rules:
 *  - All active sessions past their expiry are marked as 'expired'.
 *  - Rate-limit records older than 1 hour are deleted.
 *
 * Intended to be triggered by a scheduled job (e.g. pg_cron) or manually.
 */

import type { MixSessionRepository } from '../ports/MixSessionRepository.ts';
import type { RateLimitRepository } from '../../../../shared/ports/RateLimitRepository.ts';

export interface CleanupExpiredSessionsOutput {
  expiredSessions: number;
  deletedRateLimits: number;
}

const RATE_LIMIT_TTL_MS = 60 * 60 * 1000; // 1 hour

export class CleanupExpiredSessionsUseCase {
  constructor(
    private readonly sessions: MixSessionRepository,
    private readonly rateLimits: RateLimitRepository,
  ) {}

  async execute(): Promise<CleanupExpiredSessionsOutput> {
    const now = new Date();

    const expiredSessions = await this.sessions.markExpiredBefore(now);

    const cutoff = new Date(now.getTime() - RATE_LIMIT_TTL_MS);
    const deletedRateLimits = await this.rateLimits.deleteOlderThan(cutoff);

    return { expiredSessions, deletedRateLimits };
  }
}
