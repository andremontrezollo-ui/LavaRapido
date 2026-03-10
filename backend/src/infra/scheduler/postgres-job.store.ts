/**
 * PostgresJobStore — durable job persistence using PostgreSQL.
 * Uses SELECT FOR UPDATE SKIP LOCKED to claim jobs without contention.
 */

import { Pool } from 'pg';
import type { ScheduledJob, JobStore, JobStatus } from './job-scheduler';
import { getPool } from '../database/connection';

export class PostgresJobStore implements JobStore {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(job: ScheduledJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO scheduled_jobs
         (id, name, payload, status, attempts, max_attempts, last_attempt_at,
          completed_at, error, created_at, scheduled_for, locked_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE
         SET status=$4, attempts=$5, last_attempt_at=$7,
             completed_at=$8, error=$9, locked_until=$12`,
      [
        job.id, job.name, job.payload, job.status, job.attempts, job.maxAttempts,
        job.lastAttemptAt, job.completedAt, job.error, job.createdAt,
        job.scheduledFor, job.lockedUntil,
      ],
    );
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    const { rows } = await this.pool.query<{
      id: string; name: string; payload: string; status: JobStatus;
      attempts: number; max_attempts: number; last_attempt_at: Date | null;
      completed_at: Date | null; error: string | null; created_at: Date;
      scheduled_for: Date; locked_until: Date | null;
    }>(
      `SELECT id, name, payload, status, attempts, max_attempts, last_attempt_at,
              completed_at, error, created_at, scheduled_for, locked_until
       FROM scheduled_jobs
       WHERE status = 'pending' AND scheduled_for <= $1
       ORDER BY scheduled_for
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [now, limit],
    );
    return rows.map(this.mapRow);
  }

  async findById(id: string): Promise<ScheduledJob | null> {
    const { rows } = await this.pool.query<{
      id: string; name: string; payload: string; status: JobStatus;
      attempts: number; max_attempts: number; last_attempt_at: Date | null;
      completed_at: Date | null; error: string | null; created_at: Date;
      scheduled_for: Date; locked_until: Date | null;
    }>(
      `SELECT id, name, payload, status, attempts, max_attempts, last_attempt_at,
              completed_at, error, created_at, scheduled_for, locked_until
       FROM scheduled_jobs WHERE id=$1`,
      [id],
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async markRunning(id: string, lockedUntil: Date): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE scheduled_jobs
       SET status='running', locked_until=$2, last_attempt_at=NOW()
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
      `UPDATE scheduled_jobs SET status='pending', error=$2, last_attempt_at=$3 WHERE id=$1`,
      [id, error, now],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE scheduled_jobs SET status='dead_letter', last_attempt_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  private mapRow(r: {
    id: string; name: string; payload: string; status: JobStatus;
    attempts: number; max_attempts: number; last_attempt_at: Date | null;
    completed_at: Date | null; error: string | null; created_at: Date;
    scheduled_for: Date; locked_until: Date | null;
  }): ScheduledJob {
    return {
      id: r.id,
      name: r.name,
      payload: r.payload,
      status: r.status,
      attempts: r.attempts,
      maxAttempts: r.max_attempts,
      lastAttemptAt: r.last_attempt_at,
      completedAt: r.completed_at,
      error: r.error,
      createdAt: r.created_at,
      scheduledFor: r.scheduled_for,
      lockedUntil: r.locked_until,
    };
  }
}
