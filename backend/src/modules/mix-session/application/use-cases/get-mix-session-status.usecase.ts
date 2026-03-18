/**
 * GetMixSessionStatus — application use case.
 *
 * Business rules:
 * - Session ID must be a valid UUID (enforced by caller)
 * - If session.expiresAt < now, status is resolved to "expired"
 * - If the DB status is still "active" but expired, it is updated lazily
 * - Returns 404 when the session does not exist
 */
import type { UseCase } from '../../../../shared/application/UseCase.ts';
import type { MixSessionRepository } from '../ports/mix-session-repository.port.ts';
import type { GetMixSessionStatusRequest, GetMixSessionStatusResponse } from '../dtos/get-mix-session-status.dto.ts';

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class GetMixSessionStatusUseCase implements UseCase<GetMixSessionStatusRequest, GetMixSessionStatusResponse> {
  constructor(private readonly sessionRepo: MixSessionRepository) {}

  async execute(request: GetMixSessionStatusRequest): Promise<GetMixSessionStatusResponse> {
    const session = await this.sessionRepo.findById(request.sessionId);

    if (!session) {
      throw new SessionNotFoundError(request.sessionId);
    }

    const now = new Date();
    const isExpired = session.isExpired(now);
    const resolvedStatus = isExpired ? 'expired' : session.status;

    if (isExpired && session.status !== 'expired') {
      await this.sessionRepo.updateStatus(request.sessionId, 'expired');
    }

    return {
      sessionId: session.id,
      status: resolvedStatus,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }
}
