/**
 * Integration tests for SecureJobScheduler with mock store and lock
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureJobScheduler } from '../../src/infra/scheduler/job-scheduler';
import type { ScheduledJob, JobStore } from '../../src/infra/scheduler/job-scheduler';
import type { DistributedLock } from '../../src/shared/ports/DistributedLock';
import type { Logger } from '../../src/shared/logging';

function makeJob(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
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
    createdAt: new Date(),
    scheduledFor: new Date(Date.now() - 1000),
    lockedUntil: null,
    ...overrides,
  };
}

function makeMockJobStore(jobs: ScheduledJob[]): JobStore {
  return {
    async save(job) {
      const idx = jobs.findIndex(j => j.id === job.id);
      if (idx >= 0) jobs[idx] = { ...job };
      else jobs.push({ ...job });
    },
    async findDue(now, limit) {
      return jobs.filter(j => j.status === 'pending' && j.scheduledFor <= now).slice(0, limit);
    },
    async findById(id) { return jobs.find(j => j.id === id) ?? null; },
    async markRunning(id, lockedUntil) {
      const job = jobs.find(j => j.id === id);
      if (!job || job.status !== 'pending') return false;
      job.status = 'running';
      job.lockedUntil = lockedUntil;
      job.lastAttemptAt = new Date();
      return true;
    },
    async markCompleted(id, now) {
      const job = jobs.find(j => j.id === id);
      if (job) { job.status = 'completed'; job.completedAt = now; }
    },
    async markFailed(id, error, now) {
      const job = jobs.find(j => j.id === id);
      if (job) { job.status = 'pending'; job.error = error; job.lastAttemptAt = now; }
    },
    async markDeadLetter(id, now) {
      const job = jobs.find(j => j.id === id);
      if (job) { job.status = 'dead_letter'; job.lastAttemptAt = now; }
    },
  };
}

function makeMockLock(shouldAcquire = true): DistributedLock {
  return {
    async acquire() { return shouldAcquire; },
    async release() {},
    async renew() { return true; },
    async isHeld() { return false; },
  };
}

function makeMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

describe('SecureJobScheduler', () => {
  let jobs: ScheduledJob[];
  let logger: Logger;

  beforeEach(() => {
    jobs = [];
    logger = makeMockLogger();
  });

  it('processes a due job and marks it completed', async () => {
    jobs.push(makeJob());
    const store = makeMockJobStore(jobs);
    const lock = makeMockLock(true);
    const scheduler = new SecureJobScheduler(store, lock, logger);

    const executor = vi.fn();
    const count = await scheduler.processJobs(executor);

    expect(count).toBe(1);
    expect(executor).toHaveBeenCalledOnce();
    expect(jobs[0].status).toBe('completed');
  });

  it('skips job when lock cannot be acquired', async () => {
    jobs.push(makeJob());
    const store = makeMockJobStore(jobs);
    const lock = makeMockLock(false);
    const scheduler = new SecureJobScheduler(store, lock, logger);

    const executor = vi.fn();
    const count = await scheduler.processJobs(executor);

    expect(count).toBe(0);
    expect(executor).not.toHaveBeenCalled();
  });

  it('moves job to DLQ after maxAttempts failures', async () => {
    jobs.push(makeJob({ attempts: 2, maxAttempts: 3 }));
    const store = makeMockJobStore(jobs);
    const lock = makeMockLock(true);
    const scheduler = new SecureJobScheduler(store, lock, logger);

    const executor = vi.fn().mockRejectedValue(new Error('exec error'));
    await scheduler.processJobs(executor);

    expect(jobs[0].status).toBe('dead_letter');
  });

  it('retries job before reaching maxAttempts', async () => {
    jobs.push(makeJob({ attempts: 0, maxAttempts: 3 }));
    const store = makeMockJobStore(jobs);
    const lock = makeMockLock(true);
    const scheduler = new SecureJobScheduler(store, lock, logger);

    const executor = vi.fn().mockRejectedValue(new Error('transient error'));
    await scheduler.processJobs(executor);

    expect(jobs[0].status).toBe('pending');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does not process a job twice concurrently (lock prevents duplicate execution)', async () => {
    const job = makeJob();
    jobs.push(job);
    const store = makeMockJobStore(jobs);

    let lockCount = 0;
    const lock: DistributedLock = {
      async acquire() { lockCount++; return lockCount === 1; },
      async release() {},
      async renew() { return true; },
      async isHeld() { return false; },
    };

    const scheduler = new SecureJobScheduler(store, lock, logger);

    const executor = vi.fn();
    // Simulate two concurrent calls
    await Promise.all([
      scheduler.processJobs(executor),
      scheduler.processJobs(executor),
    ]);

    expect(executor).toHaveBeenCalledOnce();
  });
});
