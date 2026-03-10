/**
 * PostgresOutboxStore — durable outbox backed by PostgreSQL.
 * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent-safe polling.
 */

import { Pool } from 'pg';
import type { OutboxMessage, OutboxStore, OutboxStatus } from '../../shared/events/outbox-message';
import { getPool } from '../database/connection';

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(message: OutboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO outbox_messages
         (id, event_type, aggregate_id, payload, correlation_id, status, retry_count,
          created_at, last_attempt_at, published_at, error)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id,
        message.eventType,
        message.aggregateId,
        message.payload,
        message.correlationId,
        message.status,
        message.retryCount,
        message.createdAt,
        message.lastAttemptAt,
        message.publishedAt,
        message.error,
      ],
    );
  }

  async findPending(limit: number): Promise<OutboxMessage[]> {
    const { rows } = await this.pool.query<{
      id: string; event_type: string; aggregate_id: string; payload: string;
      correlation_id: string; status: OutboxStatus; retry_count: number;
      created_at: Date; last_attempt_at: Date | null; published_at: Date | null; error: string | null;
    }>(
      `SELECT id, event_type, aggregate_id, payload::text, correlation_id, status,
              retry_count, created_at, last_attempt_at, published_at, error
       FROM outbox_messages
       WHERE status = 'pending'
       ORDER BY created_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );

    return rows.map(r => ({
      id: r.id,
      eventType: r.event_type,
      aggregateId: r.aggregate_id,
      payload: r.payload,
      correlationId: r.correlation_id,
      status: r.status,
      retryCount: r.retry_count,
      createdAt: r.created_at,
      lastAttemptAt: r.last_attempt_at,
      publishedAt: r.published_at,
      error: r.error,
    }));
  }

  async markPublished(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages SET status='published', published_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages
       SET retry_count = retry_count + 1,
           last_attempt_at = $3,
           error = $2,
           status = CASE WHEN retry_count + 1 >= 5 THEN 'dead_letter' ELSE 'failed' END
       WHERE id = $1`,
      [id, error, now],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages SET status='dead_letter', last_attempt_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM outbox_messages WHERE status=$1`,
      [status],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
