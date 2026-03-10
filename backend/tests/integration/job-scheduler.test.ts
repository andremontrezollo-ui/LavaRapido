/**
 * Job Scheduler Tests
 * Verifies due-job discovery, retry logic, DLQ promotion, and lock contention.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryJobStore } from '../../src/test-utils/in-memory-job-store';
import { InMemoryDistributedLock } from '../../src/test-utils/in-memory-distributed-lock';
import { SecureJobScheduler } from '../../src/infra/scheduler/job-scheduler';
import type { ScheduledJob } from '../../src/infra/scheduler/job-scheduler';
import type { Logger } from '../../src/shared/logging';

const nopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => nopLogger,
};

let jobCounter = 0;
const makeJob = (overrides: Partial<ScheduledJob> = {}): ScheduledJob => ({
  id: `job-${++jobCounter}`,
  name: 'test-job',
  payload: '{}',
  status: 'pending',
  attempts: 0,
  maxAttempts: 3,
  lastAttemptAt: null,
  completedAt: null,
  error: null,
  scheduledFor: new Date(Date.now() - 1000), // due immediately
  lockedUntil: null,
  createdAt: new Date(),
  ...overrides,
});

describe('Job Scheduler', () => {
  let jobStore: InMemoryJobStore;
  let lock: InMemoryDistributedLock;
  let scheduler: SecureJobScheduler;

  beforeEach(() => {
    jobStore = new InMemoryJobStore();
    lock = new InMemoryDistributedLock();
    scheduler = new SecureJobScheduler(jobStore, lock, nopLogger, 30);
  });

  it('processes a due job successfully', async () => {
    const job = makeJob();
    await jobStore.save(job);
    const executed: string[] = [];

    const count = await scheduler.processJobs(
      async (j) => { executed.push(j.id); },
    );

    expect(count).toBe(1);
    expect(executed).toContain(job.id);
  });

  it('does not process a future-scheduled job', async () => {
    const job = makeJob({ scheduledFor: new Date(Date.now() + 60_000) });
    await jobStore.save(job);

    const count = await scheduler.processJobs(async () => {});

    expect(count).toBe(0);
  });

  it('marks job as completed after successful execution', async () => {
    const job = makeJob();
    await jobStore.save(job);

    await scheduler.processJobs(async () => {});

    const found = await jobStore.findById(job.id);
    expect(found!.status).toBe('completed');
  });

  it('marks job as failed (retriable) on error, status stays pending', async () => {
    const job = makeJob({ maxAttempts: 3, attempts: 0 });
    await jobStore.save(job);

    await scheduler.processJobs(async () => { throw new Error('temporary'); });

    // attempts=0 < maxAttempts=3, so should stay 'pending' for retry
    const found = await jobStore.findById(job.id);
    expect(found!.status).toBe('pending');
    expect(found!.error).toBe('temporary');
  });

  it('moves job to dead_letter after max attempts', async () => {
    const job = makeJob({ maxAttempts: 1, attempts: 0 });
    await jobStore.save(job);

    await scheduler.processJobs(async () => { throw new Error('fatal'); });

    const found = await jobStore.findById(job.id);
    expect(found!.status).toBe('dead_letter');
  });

  it('simulates lock contention: second scheduler skips locked job', async () => {
    const job = makeJob();
    await jobStore.save(job);

    // Pre-acquire the lock that the scheduler would use
    const lockKey = `job:${job.id}`;
    await lock.acquire(lockKey, 30);

    const executed: string[] = [];
    const count = await scheduler.processJobs(
      async (j) => { executed.push(j.id); },
    );

    expect(count).toBe(0);
    expect(executed).toHaveLength(0);
  });

  it('processes multiple jobs in batch respecting batchSize', async () => {
    for (let i = 0; i < 5; i++) {
      await jobStore.save(makeJob());
    }

    const executed: string[] = [];
    const count = await scheduler.processJobs(
      async (j) => { executed.push(j.id); },
      3, // batchSize
    );

    expect(count).toBe(3);
    expect(executed).toHaveLength(3);
  });
});
