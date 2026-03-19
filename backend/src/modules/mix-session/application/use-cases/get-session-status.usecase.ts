/**
 * Use Case: GetSessionStatus
 *
 * Looks up a mix session by ID and resolves its current status,
 * updating the persisted status if the session has newly expired.
 */

import type { Result } from '../../../shared';
import { success, failure } from '../../../shared';
import type { MixSessionRepository } from '../ports/mix-session-repository.port';
import type { MixSessionResponse } from '../dtos/mix-session.response';

export class GetSessionStatusUseCase {
  constructor(private readonly sessionRepo: MixSessionRepository) {}

  async execute(sessionId: string): Promise<Result<MixSessionResponse | null>> {
    try {
      const session = await this.sessionRepo.findById(sessionId);
      if (!session) return success(null);

      const now = new Date();
      const resolvedStatus = session.resolvedStatus(now);

      if (resolvedStatus === 'expired' && session.status !== 'expired') {
        await this.sessionRepo.updateStatus(sessionId, 'expired');
      }

      return success({
        sessionId: session.id,
        depositAddress: session.depositAddress,
        status: resolvedStatus,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error('Failed to get session status'));
    }
  }
}
