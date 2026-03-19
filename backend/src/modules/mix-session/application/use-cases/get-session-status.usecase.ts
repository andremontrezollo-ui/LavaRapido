import type { MixSessionRepositoryPort } from '../ports/mix-session-repository.port.ts';
import type { SessionStatusDto } from '../dtos/session-status.dto.ts';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error.ts';
import { resolvedStatus } from '../../domain/entities/mix-session.entity.ts';

export class GetSessionStatusUseCase {
  constructor(private readonly sessions: MixSessionRepositoryPort) {}

  async execute(sessionId: string): Promise<SessionStatusDto> {
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    const status = resolvedStatus(session);

    if (status === "expired" && session.status !== "expired") {
      await this.sessions.updateStatus(sessionId, "expired");
    }

    return {
      sessionId: session.id,
      status,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }
}
