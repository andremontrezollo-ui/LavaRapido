/**
 * PostgreSQL Job Store — durable replacement for InMemoryJobStore.
 * Uses advisory locks to prevent duplicate execution across instances.
 */

import type { Pool } from 'pg';
import type { ScheduledJob, JobStatus, JobStore } from './job-scheduler';

export class PostgresJobStore implements JobStore {
  constructor(private readonly pool: Pool) {}

  async save(job: ScheduledJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO jobs
         (id, name, payload, status, attempts, max_attempts,
          last_attempt_at, completed_at, error, scheduled_for, locked_until, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         status          = EXCLUDED.status,
         attempts        = EXCLUDED.attempts,
         last_attempt_at = EXCLUDED.last_attempt_at,
         completed_at    = EXCLUDED.completed_at,
         error           = EXCLUDED.error,
         locked_until    = EXCLUDED.locked_until`,
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
        job.scheduledFor,
        job.lockedUntil,
        job.createdAt,
      ],
    );
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM jobs
       WHERE status = 'pending'
         AND scheduled_for <= $1
         AND (locked_until IS NULL OR locked_until < $1)
       ORDER BY scheduled_for ASC
       LIMIT $2`,
      [now, limit],
    );
    return rows.map(this.toJob);
  }

  async findById(id: string): Promise<ScheduledJob | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM jobs WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (rows.length === 0) return null;
    return this.toJob(rows[0]);
  }

  async markRunning(id: string, lockedUntil: Date): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE jobs
       SET status = 'running', locked_until = $2, last_attempt_at = NOW(),
           attempts = attempts + 1
       WHERE id = $1 AND status = 'pending'`,
      [id, lockedUntil],
    );
    return (rowCount ?? 0) > 0;
  }

  async markCompleted(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status = 'completed', completed_at = $2, locked_until = NULL
       WHERE id = $1`,
      [id, now],
    );
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE jobs
       SET status = 'pending', error = $2, last_attempt_at = $3, locked_until = NULL
       WHERE id = $1`,
      [id, error, now],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status = 'dead_letter', last_attempt_at = $2, locked_until = NULL
       WHERE id = $1`,
      [id, now],
    );
  }

  private toJob(row: Record<string, unknown>): ScheduledJob {
    return {
      id: row.id as string,
      name: row.name as string,
      payload: row.payload as string,
      status: row.status as JobStatus,
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at as string) : null,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
      error: row.error as string | null,
      scheduledFor: new Date(row.scheduled_for as string),
      lockedUntil: row.locked_until ? new Date(row.locked_until as string) : null,
      createdAt: new Date(row.created_at as string),
    };
  }
}
