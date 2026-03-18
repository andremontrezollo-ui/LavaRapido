/**
 * CleanupExpiredSessions Use Case
 *
 * Marks all active sessions that have passed their expiry time as 'expired'.
 * Intended to be triggered by a scheduled job (e.g., pg_cron or manual POST).
 */

import type { CleanupExpiredSessionsResponse } from '../dtos/cleanup-expired-sessions.dto';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';

export class CleanupExpiredSessionsUseCase {
  constructor(private readonly sessionRepo: MixSessionRepository) {}

  async execute(): Promise<CleanupExpiredSessionsResponse> {
    const now = new Date();
    const expiredSessions = await this.sessionRepo.markExpiredSessions(now);

    return {
      expiredSessions,
      timestamp: now.toISOString(),
    };
  }
}
