import type { LogRepository } from '../ports/log-repository.port';
import type { LogClock } from '../ports/clock.port';

export class PurgeExpiredLogsUseCase {
  constructor(
    private readonly repo: LogRepository,
    private readonly clock: LogClock,
  ) {}

  async execute(): Promise<number> {
    const expired = await this.repo.findExpired(this.clock.now());
    if (expired.length === 0) return 0;

    const ids = expired.map(e => e.id);
    await this.repo.deleteMany(ids);
    return ids.length;
  }
}
