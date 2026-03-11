/**
 * PostgreSQL Outbox Store — durable, crash-safe outbox with SELECT FOR UPDATE SKIP LOCKED.
 * Guarantees at-least-once delivery and prevents duplicate processing under concurrency.
 */

import type { Pool, PoolClient } from 'pg';
import type { OutboxMessage, OutboxStore, OutboxStatus } from '../../shared/events/outbox-message';

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly pool: Pool) {}

  async save(message: OutboxMessage, client?: PoolClient): Promise<void> {
    const db = client ?? this.pool;
    await db.query(
      `INSERT INTO outbox_messages
         (id, event_type, aggregate_id, payload, correlation_id, status, retry_count,
          last_attempt_at, published_at, error, created_at)
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
        message.lastAttemptAt,
        message.publishedAt,
        message.error,
        message.createdAt,
      ],
    );
  }

  async findPending(limit: number): Promise<OutboxMessage[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM outbox_messages
       WHERE status IN ('pending','failed')
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    return rows.map(this.rowToMessage);
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
           last_attempt_at = $2,
           error = $3,
           status = CASE WHEN retry_count + 1 >= 5 THEN 'dead_letter' ELSE 'failed' END
       WHERE id = $1`,
      [id, now, error],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages SET status='dead_letter', last_attempt_at=$2 WHERE id=$1`,
      [id, now],
    );
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM outbox_messages WHERE status=$1`,
      [status],
    );
    return rows[0]?.cnt ?? 0;
  }

  private rowToMessage(row: Record<string, unknown>): OutboxMessage {
    return {
      id: row.id as string,
      eventType: row.event_type as string,
      aggregateId: row.aggregate_id as string,
      payload: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
      correlationId: row.correlation_id as string,
      status: row.status as OutboxStatus,
      retryCount: row.retry_count as number,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at as string) : null,
      publishedAt: row.published_at ? new Date(row.published_at as string) : null,
      error: row.error as string | null,
      createdAt: new Date(row.created_at as string),
    };
  }
}
