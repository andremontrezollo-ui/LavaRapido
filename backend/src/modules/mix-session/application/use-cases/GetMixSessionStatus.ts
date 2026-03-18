/**
 * GetMixSessionStatus — use case.
 *
 * Business rules:
 *  - sessionId must be a valid UUID v4.
 *  - If the session's expires_at has passed, the status is updated to 'expired'.
 */

import { isSessionExpired } from '../../domain/MixSession.ts';
import type { MixSessionRepository } from '../ports/MixSessionRepository.ts';

export interface GetMixSessionStatusInput {
  sessionId: string;
}

export interface GetMixSessionStatusOutput {
  sessionId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export class GetMixSessionStatusError extends Error {
  constructor(
    public readonly code: 'INVALID_SESSION_ID' | 'NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'GetMixSessionStatusError';
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GetMixSessionStatusUseCase {
  constructor(private readonly sessions: MixSessionRepository) {}

  async execute(input: GetMixSessionStatusInput): Promise<GetMixSessionStatusOutput> {
    if (!UUID_RE.test(input.sessionId)) {
      throw new GetMixSessionStatusError(
        'INVALID_SESSION_ID',
        'Invalid session ID format. Must be a valid UUID.',
      );
    }

    const session = await this.sessions.findById(input.sessionId);

    if (!session) {
      throw new GetMixSessionStatusError('NOT_FOUND', 'Session not found');
    }

    const now = new Date();
    const expired = isSessionExpired(session, now);
    const status = expired ? 'expired' : session.status;

    if (expired && session.status !== 'expired') {
      await this.sessions.updateStatus(input.sessionId, 'expired');
    }

    return {
      sessionId: session.id,
      status,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }
}
