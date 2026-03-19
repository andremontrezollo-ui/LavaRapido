/**
 * ExpireMixSessions Use Case
 *
 * Batch job that marks all active sessions that have exceeded their
 * expiration time. Intended to be invoked by a scheduled cleanup task.
 */

import { createSessionExpiredEvent } from '../../domain/events/session-expired.event';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';
import type { SessionClock } from '../ports/clock.port';
import type { SessionEventPublisher } from '../ports/event-publisher.port';

export interface ExpireMixSessionsResult {
  expiredCount: number;
}

export class ExpireMixSessionsUseCase {
  constructor(
    private readonly sessionRepo: MixSessionRepository,
    private readonly clock: SessionClock,
    private readonly publisher: SessionEventPublisher,
  ) {}

  async execute(): Promise<ExpireMixSessionsResult> {
    const now = this.clock.now();
    const sessions = await this.sessionRepo.findActiveExpired(now);

    for (const session of sessions) {
      session.markExpired();
      await this.sessionRepo.save(session);
      await this.publisher.publish(createSessionExpiredEvent(session.id));
    }

    return { expiredCount: sessions.length };
  }
}
