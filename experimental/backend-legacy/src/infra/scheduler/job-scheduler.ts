/**
 * Secure Job Scheduler with distributed lock and state persistence.
 */

import type { DistributedLock } from '../../shared/ports/DistributedLock';
import type { Logger } from '../../shared/logging';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';

export interface ScheduledJob {
  readonly id: string;
  readonly name: string;
  readonly payload: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  createdAt: Date;
  scheduledFor: Date;
  lockedUntil: Date | null;
}

export interface JobStore {
  save(job: ScheduledJob): Promise<void>;
  findDue(now: Date, limit: number): Promise<ScheduledJob[]>;
  findById(id: string): Promise<ScheduledJob | null>;
  markRunning(id: string, lockedUntil: Date): Promise<boolean>;
  markCompleted(id: string, now: Date): Promise<void>;
  markFailed(id: string, error: string, now: Date): Promise<void>;
  markDeadLetter(id: string, now: Date): Promise<void>;
}

export class SecureJobScheduler {
  constructor(
    private readonly store: JobStore,
    private readonly lock: DistributedLock,
    private readonly logger: Logger,
    private readonly lockTtlSeconds: number = 30,
  ) {}

  async processJobs(
    executor: (job: ScheduledJob) => Promise<void>,
    batchSize: number = 5,
  ): Promise<number> {
    const now = new Date();
    const dueJobs = await this.store.findDue(now, batchSize);
    let processed = 0;

    for (const job of dueJobs) {
      const lockKey = `job:${job.id}`;
      const acquired = await this.lock.acquire(lockKey, this.lockTtlSeconds);
      if (!acquired) {
        this.logger.debug('Job locked by another instance', { jobId: job.id });
        continue;
      }

      try {
        const lockedUntil = new Date(now.getTime() + this.lockTtlSeconds * 1000);
        const claimed = await this.store.markRunning(job.id, lockedUntil);
        if (!claimed) continue;

        await executor(job);
        await this.store.markCompleted(job.id, new Date());
        processed++;
        this.logger.info('Job completed', { jobId: job.id, jobName: job.name });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        job.attempts++;

        if (job.attempts >= job.maxAttempts) {
          await this.store.markDeadLetter(job.id, new Date());
          this.logger.error('Job moved to DLQ', { jobId: job.id, jobName: job.name, attempts: job.attempts });
        } else {
          await this.store.markFailed(job.id, error, new Date());
          this.logger.warn('Job failed, will retry', { jobId: job.id, attempts: job.attempts, error });
        }
      } finally {
        await this.lock.release(lockKey);
      }
    }

    return processed;
  }
}
