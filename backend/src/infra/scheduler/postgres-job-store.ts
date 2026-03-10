/**
 * PostgreSQL-backed Job Store.
 * Uses SELECT FOR UPDATE SKIP LOCKED to prevent concurrent double-execution.
 */

import type { Pool } from 'pg';
import type { ScheduledJob, JobStore } from './job-scheduler';

export class PostgresJobStore implements JobStore {
  constructor(private readonly pool: Pool) {}

  async save(job: ScheduledJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO scheduled_jobs
         (id, name, payload, status, attempts, max_attempts, last_attempt_at,
          completed_at, error, scheduled_for, locked_until, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         status=$4,
         attempts=$5,
         last_attempt_at=$7,
         completed_at=$8,
         error=$9,
         locked_until=$11`,
      [
        job.id,
        job.name,
        job.payload,
        job.status,
        job.attempts,
        job.maxAttempts,
        job.lastAttemptAt ?? null,
        job.completedAt ?? null,
        job.error ?? null,
        job.scheduledFor,
        job.lockedUntil ?? null,
        job.createdAt,
      ],
    );
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    const { rows } = await this.pool.query<{
      id: string; name: string; payload: string; status: any; attempts: number;
      max_attempts: number; last_attempt_at: Date | null; completed_at: Date | null;
      error: string | null; scheduled_for: Date; locked_until: Date | null; created_at: Date;
    }>(
      `SELECT id, name, payload, status, attempts, max_attempts, last_attempt_at,
              completed_at, error, scheduled_for, locked_until, created_at
       FROM scheduled_jobs
       WHERE status='pending' AND scheduled_for<=$1
       ORDER BY scheduled_for
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [now, limit],
    );

    return rows.map(r => this.mapRow(r));
  }

  async findById(id: string): Promise<ScheduledJob | null> {
    const { rows } = await this.pool.query<{
      id: string; name: string; payload: string; status: any; attempts: number;
      max_attempts: number; last_attempt_at: Date | null; completed_at: Date | null;
      error: string | null; scheduled_for: Date; locked_until: Date | null; created_at: Date;
    }>(
      `SELECT id, name, payload, status, attempts, max_attempts, last_attempt_at,
              completed_at, error, scheduled_for, locked_until, created_at
       FROM scheduled_jobs WHERE id=$1`,
      [id],
    );

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async markRunning(id: string, lockedUntil: Date): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE scheduled_jobs
       SET status='running', locked_until=$1, last_attempt_at=now()
       WHERE id=$2 AND status='pending'`,
      [lockedUntil, id],
    );
    return (rowCount ?? 0) > 0;
  }

  async markCompleted(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs SET status='completed', completed_at=$1 WHERE id=$2`,
      [now, id],
    );
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs SET status='pending', error=$1, last_attempt_at=$2 WHERE id=$3`,
      [error, now, id],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs SET status='dead_letter', last_attempt_at=$1 WHERE id=$2`,
      [now, id],
    );
  }

  private mapRow(r: {
    id: string; name: string; payload: string; status: any; attempts: number;
    max_attempts: number; last_attempt_at: Date | null; completed_at: Date | null;
    error: string | null; scheduled_for: Date; locked_until: Date | null; created_at: Date;
  }): ScheduledJob {
    return {
      id: r.id,
      name: r.name,
      payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload),
      status: r.status,
      attempts: r.attempts,
      maxAttempts: r.max_attempts,
      lastAttemptAt: r.last_attempt_at,
      completedAt: r.completed_at,
      error: r.error,
      scheduledFor: r.scheduled_for,
      lockedUntil: r.locked_until,
      createdAt: r.created_at,
    };
  }
}
