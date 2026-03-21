/**
 * In-Memory Job Store.
 */

import type { ScheduledJob, JobStore } from './job-scheduler';

export class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, ScheduledJob>();

  async save(job: ScheduledJob): Promise<void> {
    this.jobs.set(job.id, { ...job });
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    return Array.from(this.jobs.values())
      .filter(j => j.status === 'pending' && j.scheduledFor <= now)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
      .slice(0, limit);
  }

  async findById(id: string): Promise<ScheduledJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async markRunning(id: string, lockedUntil: Date): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'pending') return false;
    job.status = 'running';
    job.lockedUntil = lockedUntil;
    job.lastAttemptAt = new Date();
    return true;
  }

  async markCompleted(id: string, now: Date): Promise<void> {
    const job = this.jobs.get(id);
    if (job) { job.status = 'completed'; job.completedAt = now; }
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    const job = this.jobs.get(id);
    if (job) { job.status = 'pending'; job.error = error; job.lastAttemptAt = now; }
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    const job = this.jobs.get(id);
    if (job) { job.status = 'dead_letter'; job.lastAttemptAt = now; }
  }

  clear(): void { this.jobs.clear(); }
}
