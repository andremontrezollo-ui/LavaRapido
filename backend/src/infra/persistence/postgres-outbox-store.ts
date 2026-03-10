import { Pool } from 'pg';
import type { OutboxMessage, OutboxStore, OutboxStatus } from '../../shared/events/outbox-message';

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly pool: Pool) {}

  async save(message: OutboxMessage): Promise<void> {
    const payload = {
      data: JSON.parse(message.payload),
      correlationId: message.correlationId,
    };
    await this.pool.query(
      `INSERT INTO outbox_messages
         (id, event_type, aggregate_id, payload, status, retry_count, created_at, published_at, last_attempt_at, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id,
        message.eventType,
        message.aggregateId,
        payload,
        message.status,
        message.retryCount,
        message.createdAt,
        message.publishedAt,
        message.lastAttemptAt,
        message.error,
      ],
    );
  }

  async findPending(limit: number): Promise<OutboxMessage[]> {
    const result = await this.pool.query<{
      id: string;
      event_type: string;
      aggregate_id: string;
      payload: { data: Record<string, unknown>; correlationId: string };
      status: OutboxStatus;
      retry_count: number;
      created_at: Date;
      published_at: Date | null;
      last_attempt_at: Date | null;
      error: string | null;
    }>(
      `SELECT id, event_type, aggregate_id, payload, status, retry_count, created_at, published_at, last_attempt_at, error
       FROM outbox_messages
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    return result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      payload: JSON.stringify(row.payload.data ?? row.payload),
      correlationId: row.payload.correlationId ?? '',
      createdAt: row.created_at,
      status: row.status,
      retryCount: row.retry_count,
      publishedAt: row.published_at,
      lastAttemptAt: row.last_attempt_at,
      error: row.error,
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
       SET status='failed', error=$2, last_attempt_at=$3, retry_count=retry_count+1
       WHERE id=$1`,
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
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM outbox_messages WHERE status=$1`,
      [status],
    );
    return parseInt(result.rows[0].count, 10);
  }
}
