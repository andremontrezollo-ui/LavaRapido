/**
 * PostgreSQL Job Store
 * Production implementation backed by the `scheduled_jobs` table.
 */

import { Pool } from 'pg';
import type { ScheduledJob, JobStore, JobStatus } from '../scheduler/job-scheduler';

interface JobRow {
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
}

function rowToJob(row: JobRow): ScheduledJob {
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

export class PostgresJobStore implements JobStore {
  constructor(private readonly pool: Pool) {}

  async save(job: ScheduledJob): Promise<void> {
    await this.pool.query(`
      INSERT INTO scheduled_jobs
        (id, name, payload, status, attempts, max_attempts,
         last_attempt_at, completed_at, error, created_at, scheduled_for, locked_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        status          = EXCLUDED.status,
        attempts        = EXCLUDED.attempts,
        last_attempt_at = EXCLUDED.last_attempt_at,
        completed_at    = EXCLUDED.completed_at,
        error           = EXCLUDED.error,
        locked_until    = EXCLUDED.locked_until
    `, [
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
    ]);
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    const { rows } = await this.pool.query<JobRow>(`
      SELECT *
      FROM   scheduled_jobs
      WHERE  status = 'pending'
        AND  scheduled_for <= $1
      ORDER BY scheduled_for ASC
      LIMIT  $2
      FOR UPDATE SKIP LOCKED
    `, [now, limit]);
    return rows.map(rowToJob);
  }

  async findById(id: string): Promise<ScheduledJob | null> {
    const { rows } = await this.pool.query<JobRow>(
      'SELECT * FROM scheduled_jobs WHERE id = $1',
      [id],
    );
    return rows[0] ? rowToJob(rows[0]) : null;
  }

  async markRunning(id: string, lockedUntil: Date): Promise<boolean> {
    const { rowCount } = await this.pool.query(`
      UPDATE scheduled_jobs
      SET    status = 'running',
             locked_until = $2,
             last_attempt_at = NOW()
      WHERE  id = $1 AND status = 'pending'
    `, [id, lockedUntil]);
    return (rowCount ?? 0) > 0;
  }

  async markCompleted(id: string, now: Date): Promise<void> {
    await this.pool.query(`
      UPDATE scheduled_jobs
      SET    status = 'completed', completed_at = $2
      WHERE  id = $1
    `, [id, now]);
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(`
      UPDATE scheduled_jobs
      SET    status = 'pending',
             error  = $2,
             last_attempt_at = $3
      WHERE  id = $1
    `, [id, error, now]);
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(`
      UPDATE scheduled_jobs
      SET    status = 'dead_letter', last_attempt_at = $2
      WHERE  id = $1
    `, [id, now]);
  }
}
