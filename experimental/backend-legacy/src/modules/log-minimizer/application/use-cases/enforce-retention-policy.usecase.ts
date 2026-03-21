import type { LogRepository } from '../ports/log-repository.port';
import type { LogClock } from '../ports/clock.port';
import { LogRetentionPolicy } from '../../domain/policies/log-retention.policy';

export class EnforceRetentionPolicyUseCase {
  private readonly policy = new LogRetentionPolicy();

  constructor(
    private readonly repo: LogRepository,
    private readonly clock: LogClock,
  ) {}

  async execute(): Promise<number> {
    const all = await this.repo.findAll();
    const now = this.clock.now();
    const toDelete: string[] = [];

    for (const entry of all) {
      const ageSeconds = (now.getTime() - entry.createdAt.getTime()) / 1000;
      const result = this.policy.evaluate({ classification: entry.classification.value, ageSeconds });
      if (result.shouldPurge) toDelete.push(entry.id);
    }

    if (toDelete.length > 0) await this.repo.deleteMany(toDelete);
    return toDelete.length;
  }
}
