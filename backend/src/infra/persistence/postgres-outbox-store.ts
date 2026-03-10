/**
 * PostgreSQL Outbox Store — durable replacement for InMemoryOutboxStore.
 */

import type { Pool } from 'pg';
import type { OutboxMessage, OutboxStore, OutboxStatus } from '../../shared/events/outbox-message';

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly pool: Pool) {}

  async save(message: OutboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO outbox_messages
         (id, event_type, aggregate_id, payload, correlation_id, status,
          retry_count, last_attempt_at, published_at, error, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         status          = EXCLUDED.status,
         retry_count     = EXCLUDED.retry_count,
         last_attempt_at = EXCLUDED.last_attempt_at,
         published_at    = EXCLUDED.published_at,
         error           = EXCLUDED.error`,
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
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
    return rows.map(this.toMessage);
  }

  async markPublished(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages
       SET status = 'published', published_at = $2
       WHERE id = $1`,
      [id, now],
    );
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages
       SET status = 'failed', error = $2, last_attempt_at = $3,
           retry_count = retry_count + 1
       WHERE id = $1`,
      [id, error, now],
    );
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_messages
       SET status = 'dead_letter', last_attempt_at = $2
       WHERE id = $1`,
      [id, now],
    );
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::integer AS count FROM outbox_messages WHERE status = $1`,
      [status],
    );
    return rows[0].count as number;
  }

  private toMessage(row: Record<string, unknown>): OutboxMessage {
    return {
      id: row.id as string,
      eventType: row.event_type as string,
      aggregateId: row.aggregate_id as string,
      payload: row.payload as string,
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
