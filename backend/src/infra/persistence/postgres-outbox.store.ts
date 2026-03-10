/**
 * PostgreSQL Outbox Store
 * Production implementation of OutboxStore backed by the `outbox_messages` table.
 */

import { Pool } from 'pg';
import type { OutboxMessage, OutboxStore, OutboxStatus } from '../../shared/events/outbox-message';

interface OutboxRow {
  id: string;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  status: OutboxStatus;
  retry_count: number;
  last_attempt_at: Date | null;
  published_at: Date | null;
  error: string | null;
  created_at: Date;
}

function rowToMessage(row: OutboxRow): OutboxMessage {
  return {
    id: row.id,
    eventType: row.event_type,
    aggregateId: row.aggregate_id,
    payload: JSON.stringify(row.payload),
    correlationId: row.correlation_id,
    status: row.status,
    retryCount: row.retry_count,
    lastAttemptAt: row.last_attempt_at,
    publishedAt: row.published_at,
    error: row.error,
    createdAt: row.created_at,
  };
}

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly pool: Pool) {}

  async save(message: OutboxMessage): Promise<void> {
    await this.pool.query(`
      INSERT INTO outbox_messages
        (id, event_type, aggregate_id, payload, correlation_id, status,
         retry_count, last_attempt_at, published_at, error, created_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        status          = EXCLUDED.status,
        retry_count     = EXCLUDED.retry_count,
        last_attempt_at = EXCLUDED.last_attempt_at,
        published_at    = EXCLUDED.published_at,
        error           = EXCLUDED.error
    `, [
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
    ]);
  }

  async findPending(limit: number): Promise<OutboxMessage[]> {
    const { rows } = await this.pool.query<OutboxRow>(`
      SELECT *
      FROM   outbox_messages
      WHERE  status IN ('pending', 'failed')
      ORDER BY created_at ASC
      LIMIT  $1
      FOR UPDATE SKIP LOCKED
    `, [limit]);
    return rows.map(rowToMessage);
  }

  async markPublished(id: string, now: Date): Promise<void> {
    await this.pool.query(`
      UPDATE outbox_messages
      SET    status = 'published', published_at = $2, last_attempt_at = $2
      WHERE  id = $1
    `, [id, now]);
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    await this.pool.query(`
      UPDATE outbox_messages
      SET    retry_count     = retry_count + 1,
             last_attempt_at = $2,
             error           = $3,
             status          = CASE WHEN retry_count + 1 >= 5 THEN 'dead_letter' ELSE 'failed' END
      WHERE  id = $1
    `, [id, now, error]);
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    await this.pool.query(`
      UPDATE outbox_messages
      SET    status = 'dead_letter', last_attempt_at = $2
      WHERE  id = $1
    `, [id, now]);
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM outbox_messages WHERE status = $1',
      [status],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
