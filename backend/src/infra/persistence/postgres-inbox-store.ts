/**
 * PostgreSQL Inbox Store — durable deduplication for incoming events.
 * Uses PRIMARY KEY (event_id, handler_name) for atomic duplicate detection.
 */

import type { Pool } from 'pg';
import type { InboxMessage, InboxStore } from '../../shared/events/inbox-message';

export class PostgresInboxStore implements InboxStore {
  constructor(private readonly pool: Pool) {}

  async exists(eventId: string, handlerName: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM inbox_messages WHERE event_id=$1 AND handler_name=$2 LIMIT 1`,
      [eventId, handlerName],
    );
    return rows.length > 0;
  }

  async save(message: InboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO inbox_messages (event_id, handler_name, event_type, aggregate_id, processed_at, checksum)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (event_id, handler_name) DO NOTHING`,
      [
        message.eventId,
        message.handlerName,
        message.eventType,
        message.aggregateId,
        message.processedAt,
        message.checksum,
      ],
    );
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM inbox_messages WHERE event_id=$1`,
      [eventId],
    );
    return rows.map(this.rowToMessage);
  }

  async countProcessed(since: Date): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM inbox_messages WHERE processed_at >= $1`,
      [since],
    );
    return rows[0]?.cnt ?? 0;
  }

  private rowToMessage(row: Record<string, unknown>): InboxMessage {
    return {
      eventId: row.event_id as string,
      handlerName: row.handler_name as string,
      eventType: row.event_type as string,
      aggregateId: row.aggregate_id as string,
      processedAt: new Date(row.processed_at as string),
      checksum: row.checksum as string,
    };
  }
}
