/**
 * CleanupExpiredSessions — application use case.
 *
 * Business rules:
 * - Mark all active sessions whose expires_at has passed as "expired"
 * - Delete rate_limit records older than 1 hour
 * - Designed to be invoked by a scheduler (pg_cron or manual POST)
 */
import type { UseCase } from '../../../../shared/application/UseCase.ts';
import type { MixSessionRepository } from '../ports/mix-session-repository.port.ts';
import type { RateLimitRepository } from '../ports/rate-limit-repository.port.ts';
import type { CleanupSessionsResponse } from '../dtos/cleanup-sessions.dto.ts';

const RATE_LIMIT_TTL_MS = 60 * 60 * 1000; // 1 hour

export class CleanupExpiredSessionsUseCase implements UseCase<void, CleanupSessionsResponse> {
  constructor(
    private readonly sessionRepo: MixSessionRepository,
    private readonly rateLimitRepo: RateLimitRepository,
  ) {}

  async execute(): Promise<CleanupSessionsResponse> {
    const now = new Date();
    const expiredSessions = await this.sessionRepo.markExpiredSessions(now);

    const oneHourAgo = new Date(now.getTime() - RATE_LIMIT_TTL_MS);
    const deletedRateLimits = await this.rateLimitRepo.deleteOlderThan(oneHourAgo);

    return { expiredSessions, deletedRateLimits };
  }
}
