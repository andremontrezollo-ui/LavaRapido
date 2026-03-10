/**
 * PostgreSQL-backed Outbox Store.
 * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent-safe processing.
 */

import type { Pool, PoolClient } from 'pg';
import type { OutboxMessage, OutboxStore, OutboxStatus } from '../../shared/events/outbox-message';

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly pool: Pool) {}

  async save(message: OutboxMessage): Promise<void>;
  async save(message: OutboxMessage, client?: PoolClient): Promise<void>;
  async save(message: OutboxMessage, client?: PoolClient): Promise<void> {
    const db = client ?? this.pool;
    await db.query(
      `INSERT INTO outbox_messages
         (id, event_type, aggregate_id, correlation_id, payload, status, retry_count,
          last_attempt_at, published_at, error, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id,
        message.eventType,
        message.aggregateId,
        message.correlationId,
        message.payload,
        message.status,
        message.retryCount,
        message.lastAttemptAt ?? null,
        message.publishedAt ?? null,
        message.error ?? null,
        message.createdAt,
      ],
    );
  }

  async findPending(limit: number): Promise<OutboxMessage[]> {
    const { rows } = await this.pool.query<{
      id: string; event_type: string; aggregate_id: string; correlation_id: string;
      payload: string; status: OutboxStatus; retry_count: number;
      last_attempt_at: Date | null; published_at: Date | null; error: string | null;
      created_at: Date;
    }>(
      `SELECT id, event_type, aggregate_id, correlation_id, payload, status,
              retry_count, last_attempt_at, published_at, error, created_at
       FROM outbox_messages
       WHERE status IN ('pending','failed')
       ORDER BY created_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );

    return rows.map(r => ({
      id: r.id,
      eventType: r.event_type,
      aggregateId: r.aggregate_id,
      correlationId: r.correlation_id,
      payload: r.payload,
      status: r.status,
      retryCount: r.retry_count,
      lastAttemptAt: r.last_attempt_at,
      publishedAt: r.published_at,
      error: r.error,
      createdAt: r.created_at,
    }));
  }

  async markPublished(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages SET status='published', published_at=$1 WHERE id=$2`,
      [now, id],
    );
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages
       SET retry_count = retry_count + 1,
           last_attempt_at = $1,
           error = $2,
           status = CASE WHEN retry_count + 1 >= 5 THEN 'dead_letter' ELSE 'failed' END
       WHERE id = $3`,
      [now, error, id],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages SET status='dead_letter', last_attempt_at=$1 WHERE id=$2`,
      [now, id],
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
