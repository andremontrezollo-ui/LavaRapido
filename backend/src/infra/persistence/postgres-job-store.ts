import { Pool } from 'pg';
import type { ScheduledJob, JobStatus, JobStore } from '../scheduler/job-scheduler';

export class PostgresJobStore implements JobStore {
  constructor(private readonly pool: Pool) {}

  async save(job: ScheduledJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO jobs
         (id, name, payload, status, attempts, max_attempts, last_attempt_at, completed_at, error, created_at, scheduled_for, locked_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         status=EXCLUDED.status,
         attempts=EXCLUDED.attempts,
         last_attempt_at=EXCLUDED.last_attempt_at,
         completed_at=EXCLUDED.completed_at,
         error=EXCLUDED.error,
         locked_until=EXCLUDED.locked_until`,
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
    const result = await this.pool.query<{
      id: string;
      name: string;
      payload: string;
      status: JobStatus;
      attempts: number;
      max_attempts: number;
      last_attempt_at: Date | null;
      completed_at: Date | null;
      error: string | null;
      created_at: Date;
      scheduled_for: Date;
      locked_until: Date | null;
    }>(
      `SELECT id, name, payload, status, attempts, max_attempts, last_attempt_at, completed_at,
              error, created_at, scheduled_for, locked_until
       FROM jobs
       WHERE status='pending' AND scheduled_for <= $1
         AND (locked_until IS NULL OR locked_until < $1)
       ORDER BY scheduled_for ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [now, limit],
    );
    return result.rows.map(row => this.mapRow(row));
  }

  async findById(id: string): Promise<ScheduledJob | null> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      payload: string;
      status: JobStatus;
      attempts: number;
      max_attempts: number;
      last_attempt_at: Date | null;
      completed_at: Date | null;
      error: string | null;
      created_at: Date;
      scheduled_for: Date;
      locked_until: Date | null;
    }>(
      `SELECT id, name, payload, status, attempts, max_attempts, last_attempt_at, completed_at,
              error, created_at, scheduled_for, locked_until
       FROM jobs WHERE id=$1`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async markRunning(id: string, lockedUntil: Date): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE jobs
       SET status='running', locked_until=$2, last_attempt_at=NOW(), attempts=attempts+1
       WHERE id=$1 AND status='pending'
       RETURNING id`,
      [id, lockedUntil],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markCompleted(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status='completed', completed_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status='pending', error=$2, last_attempt_at=$3, locked_until=NULL WHERE id=$1`,
      [id, error, now],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status='dead_letter', last_attempt_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  private mapRow(row: {
    id: string;
    name: string;
    payload: string;
    status: JobStatus;
    attempts: number;
    max_attempts: number;
    last_attempt_at: Date | null;
    completed_at: Date | null;
    error: string | null;
    created_at: Date;
    scheduled_for: Date;
    locked_until: Date | null;
  }): ScheduledJob {
    return {
      id: row.id,
      name: row.name,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastAttemptAt: row.last_attempt_at,
      completedAt: row.completed_at,
      error: row.error,
      createdAt: row.created_at,
      scheduledFor: row.scheduled_for,
      lockedUntil: row.locked_until,
    };
  }
}
