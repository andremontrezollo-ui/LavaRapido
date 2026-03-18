/**
 * GetMixSessionStatus Use Case
 *
 * Retrieves the current status of a mix session, accounting for time-based expiry.
 * If the session is found to be expired (time-based) but not yet marked in storage,
 * it triggers an async status update.
 */

import type { GetMixSessionStatusRequest, GetMixSessionStatusResponse } from '../dtos/get-mix-session-status.dto';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class GetMixSessionStatusUseCase {
  constructor(private readonly sessionRepo: MixSessionRepository) {}

  async execute(request: GetMixSessionStatusRequest): Promise<GetMixSessionStatusResponse> {
    const session = await this.sessionRepo.findById(request.sessionId);
    if (!session) {
      throw new SessionNotFoundError(request.sessionId);
    }

    const now = new Date();
    const effectiveStatus = session.effectiveStatus(now);

    // Lazily persist the expired state if needed
    if (effectiveStatus.isExpired() && !session.status.isExpired()) {
      // Fire-and-forget: update status in storage without blocking the response
      this.sessionRepo.updateStatusToExpired(session.id).catch(() => {
        // Best-effort; next cleanup job will catch stragglers
      });
    }

    return {
      sessionId: session.id,
      status: effectiveStatus.value,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }
}
