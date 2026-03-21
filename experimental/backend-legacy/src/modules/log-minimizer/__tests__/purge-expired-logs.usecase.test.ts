import { describe, it, expect } from 'vitest';
import { PurgeExpiredLogsUseCase } from '../application/use-cases/purge-expired-logs.usecase';
import { InMemoryLogRepository } from '../infra/repositories/log.repository';
import { LogEntry } from '../domain/entities/log-entry.entity';
import { LogLevel } from '../domain/value-objects/log-level.vo';
import { SensitivityClassification } from '../domain/value-objects/sensitivity-classification.vo';

describe('PurgeExpiredLogsUseCase', () => {
  it('should purge expired log entries', async () => {
    const repo = new InMemoryLogRepository();
    const past = new Date(Date.now() - 100000);
    const expired = new LogEntry('1', LogLevel.create('info'), SensitivityClassification.create('public'), 'test', {}, past, new Date(past.getTime() + 1000));
    await repo.save(expired);

    const clock = { now: () => new Date() };
    const uc = new PurgeExpiredLogsUseCase(repo, clock);
    const count = await uc.execute();

    expect(count).toBe(1);
    expect(await repo.findById('1')).toBeNull();
  });
});
