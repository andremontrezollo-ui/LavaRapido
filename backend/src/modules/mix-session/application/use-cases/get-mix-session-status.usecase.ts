/**
 * GetMixSessionStatus Use Case
 *
 * Retrieves the current status of a mix session. If the session
 * has passed its expiry time, it is lazily marked as expired and
 * a domain event is emitted.
 */

import { createSessionExpiredEvent } from '../../domain/events/session-expired.event';
import type { GetMixSessionStatusRequest } from '../dtos/get-mix-session-status.request';
import type { GetMixSessionStatusResponse } from '../dtos/get-mix-session-status.response';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';
import type { SessionClock } from '../ports/clock.port';
import type { SessionEventPublisher } from '../ports/event-publisher.port';

export class GetMixSessionStatusUseCase {
  constructor(
    private readonly sessionRepo: MixSessionRepository,
    private readonly clock: SessionClock,
    private readonly publisher: SessionEventPublisher,
  ) {}

  async execute(
    request: GetMixSessionStatusRequest,
  ): Promise<GetMixSessionStatusResponse | null> {
    const session = await this.sessionRepo.findById(request.sessionId);
    if (!session) return null;

    const now = this.clock.now();
    if (session.isExpired(now) && session.status !== 'expired') {
      session.markExpired();
      await this.sessionRepo.save(session);
      await this.publisher.publish(createSessionExpiredEvent(session.id));
    }

    return {
      sessionId: session.id,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }
}
