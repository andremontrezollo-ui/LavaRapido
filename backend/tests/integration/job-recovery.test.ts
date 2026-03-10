/**
 * Integration test — Job recovery (dead-letter, lock acquisition)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryJobStore } from '../../src/test-utils/InMemoryJobStore';
import { InMemoryDistributedLock } from '../../src/test-utils/InMemoryDistributedLock';
import { SecureJobScheduler } from '../../src/infra/scheduler/job-scheduler';
import type { ScheduledJob } from '../../src/infra/scheduler/job-scheduler';
import type { Logger } from '../../src/shared/logging';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};

let jobCounter = 0;
function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  const id = `job-${++jobCounter}`;
  return {
    id,
    name: 'test-job',
    payload: '{}',
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    lastAttemptAt: null,
    completedAt: null,
    error: null,
    createdAt: new Date(),
    scheduledFor: new Date(Date.now() - 1000),
    lockedUntil: null,
    ...overrides,
  };
}

describe('SecureJobScheduler — job recovery', () => {
  let store: InMemoryJobStore;
  let lock: InMemoryDistributedLock;
  let scheduler: SecureJobScheduler;

  beforeEach(() => {
    store = new InMemoryJobStore();
    lock = new InMemoryDistributedLock();
    scheduler = new SecureJobScheduler(store, lock, noopLogger, 30);
  });

  it('executes a due job and marks it completed', async () => {
    const job = makeJob();
    await store.save(job);

    const executed: string[] = [];
    const count = await scheduler.processJobs(async (j) => { executed.push(j.id); });

    expect(count).toBe(1);
    expect(executed).toContain(job.id);
    const saved = await store.findById(job.id);
    expect(saved?.status).toBe('completed');
  });

  it('marks job as failed when executor throws', async () => {
    const job = makeJob();
    await store.save(job);

    await scheduler.processJobs(async () => { throw new Error('executor failed'); });

    const saved = await store.findById(job.id);
    expect(saved?.status).toBe('pending'); // reset to pending for retry
    expect(saved?.error).toContain('executor failed');
  });

  it('does not process a job that is already locked', async () => {
    const job = makeJob();
    await store.save(job);

    // Pre-acquire the lock to simulate another instance holding it
    await lock.acquire(`job:${job.id}`, 30);

    const executed: string[] = [];
    await scheduler.processJobs(async (j) => { executed.push(j.id); });

    expect(executed).toHaveLength(0);
  });

  it('does not process jobs not yet due', async () => {
    const futureJob = makeJob({ scheduledFor: new Date(Date.now() + 60_000) });
    await store.save(futureJob);

    const executed: string[] = [];
    await scheduler.processJobs(async (j) => { executed.push(j.id); });

    expect(executed).toHaveLength(0);
  });
});
