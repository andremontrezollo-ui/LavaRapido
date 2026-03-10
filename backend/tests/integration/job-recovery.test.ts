/**
 * Integration test: Job recovery after failures.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryJobStore } from '../../src/test-utils/InMemoryJobStore';
import { InMemoryDistributedLock } from '../../src/test-utils/InMemoryDistributedLock';
import { SecureJobScheduler } from '../../src/infra/scheduler/job-scheduler';
import type { ScheduledJob } from '../../src/infra/scheduler/job-scheduler';

class MockLogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  child() { return this; }
}

function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  const now = new Date();
  return {
    id: 'job-1',
    name: 'test-job',
    payload: '{}',
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    lastAttemptAt: null,
    completedAt: null,
    error: null,
    createdAt: now,
    scheduledFor: new Date(now.getTime() - 1000), // already due
    lockedUntil: null,
    ...overrides,
  };
}

describe('Job Recovery', () => {
  let store: InMemoryJobStore;
  let lock: InMemoryDistributedLock;
  let scheduler: SecureJobScheduler;

  beforeEach(() => {
    store = new InMemoryJobStore();
    lock = new InMemoryDistributedLock();
    scheduler = new SecureJobScheduler(store, lock, new MockLogger() as any, 30);
  });

  it('should process and complete a due job', async () => {
    const job = makeJob();
    await store.save(job);

    const executed: string[] = [];
    const processed = await scheduler.processJobs(async (j) => {
      executed.push(j.id);
    });

    expect(processed).toBe(1);
    expect(executed).toContain('job-1');
    const updated = await store.findById('job-1');
    expect(updated?.status).toBe('completed');
  });

  it('should not process jobs not yet due', async () => {
    const future = new Date(Date.now() + 60_000);
    const job = makeJob({ scheduledFor: future });
    await store.save(job);

    const processed = await scheduler.processJobs(async () => {});
    expect(processed).toBe(0);
  });

  it('should move job to dead_letter after maxAttempts', async () => {
    const job = makeJob({ attempts: 2, maxAttempts: 3 });
    await store.save(job);

    await scheduler.processJobs(async () => { throw new Error('always fails'); });

    const updated = await store.findById('job-1');
    expect(updated?.status).toBe('dead_letter');
  });

  it('should retry job if within maxAttempts', async () => {
    const job = makeJob({ attempts: 0, maxAttempts: 3 });
    await store.save(job);

    await scheduler.processJobs(async () => { throw new Error('transient'); });

    const updated = await store.findById('job-1');
    expect(updated?.status).toBe('pending');
  });

  it('should skip job held by another lock', async () => {
    const job = makeJob();
    await store.save(job);

    // Pre-acquire lock
    await lock.acquire('job:job-1', 30);

    const executed: string[] = [];
    const processed = await scheduler.processJobs(async (j) => { executed.push(j.id); });

    expect(processed).toBe(0);
    expect(executed).toHaveLength(0);
  });
});
