/**
 * PostgreSQL Job Store — persistent job queue with SELECT FOR UPDATE SKIP LOCKED.
 * Prevents duplicate job execution under concurrent workers.
 */

import type { Pool } from 'pg';
import type { ScheduledJob, JobStore, JobStatus } from './job-scheduler';

export class PostgresJobStore implements JobStore {
  constructor(private readonly pool: Pool) {}

  async save(job: ScheduledJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO scheduled_jobs
         (id, name, payload, status, attempts, max_attempts, last_attempt_at, completed_at,
          error, created_at, scheduled_for, locked_until)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         attempts = EXCLUDED.attempts,
         last_attempt_at = EXCLUDED.last_attempt_at,
         completed_at = EXCLUDED.completed_at,
         error = EXCLUDED.error,
         locked_until = EXCLUDED.locked_until`,
      [
        job.id,
        job.name,
        job.payload,
        job.status,
        job.attempts,
        job.maxAttempts,
        job.lastAttemptAt,
        job.completedAt,
        job.error,
        job.createdAt,
        job.scheduledFor,
        job.lockedUntil,
      ],
    );
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM scheduled_jobs
       WHERE status = 'pending'
         AND scheduled_for <= $1
       ORDER BY scheduled_for ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [now, limit],
    );
    return rows.map(this.rowToJob);
  }

  async findById(id: string): Promise<ScheduledJob | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM scheduled_jobs WHERE id=$1`,
      [id],
    );
    return rows[0] ? this.rowToJob(rows[0]) : null;
  }

  async markRunning(id: string, lockedUntil: Date): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE scheduled_jobs SET status='running', locked_until=$2, last_attempt_at=now()
       WHERE id=$1 AND status='pending'`,
      [id, lockedUntil],
    );
    return (rowCount ?? 0) > 0;
  }

  async markCompleted(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs SET status='completed', completed_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs SET status='pending', error=$2, last_attempt_at=$3, locked_until=null WHERE id=$1`,
      [id, error, now],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs SET status='dead_letter', last_attempt_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  private rowToJob(row: Record<string, unknown>): ScheduledJob {
    return {
      id: row.id as string,
      name: row.name as string,
      payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
      status: row.status as JobStatus,
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at as string) : null,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
      error: row.error as string | null,
      createdAt: new Date(row.created_at as string),
      scheduledFor: new Date(row.scheduled_for as string),
      lockedUntil: row.locked_until ? new Date(row.locked_until as string) : null,
    };
  }
}
