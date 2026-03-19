import type { CleanupRepositoryPort } from '../ports/cleanup-repository.port.ts';
import type { CleanupResultDto } from '../dtos/cleanup-result.dto.ts';

/** How far back we keep rate-limit records (1 hour). */
const RATE_LIMIT_RETENTION_MS = 60 * 60 * 1000;

export class RunCleanupUseCase {
  constructor(private readonly repo: CleanupRepositoryPort) {}

  async execute(): Promise<CleanupResultDto> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - RATE_LIMIT_RETENTION_MS);

    const [expiredSessions, deletedRateLimits] = await Promise.all([
      this.repo.expireActiveSessions(now.toISOString()),
      this.repo.deleteOldRateLimits(oneHourAgo.toISOString()),
    ]);

    return {
      status: "ok",
      expiredSessions,
      deletedRateLimits,
      timestamp: now.toISOString(),
    };
  }
}
