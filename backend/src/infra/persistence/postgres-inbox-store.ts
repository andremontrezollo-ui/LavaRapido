/**
 * PostgreSQL Inbox Store — durable replacement for InMemoryInboxStore.
 */

import type { Pool } from 'pg';
import type { InboxMessage, InboxStore } from '../../shared/events/inbox-message';

export class PostgresInboxStore implements InboxStore {
  constructor(private readonly pool: Pool) {}

  async exists(eventId: string, handlerName: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM inbox_messages WHERE event_id = $1 AND handler_name = $2 LIMIT 1`,
      [eventId, handlerName],
    );
    return rows.length > 0;
  }

  async save(message: InboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO inbox_messages
         (event_id, handler_name, event_type, aggregate_id, checksum, processed_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (event_id, handler_name) DO NOTHING`,
      [
        message.eventId,
        message.handlerName,
        message.eventType,
        message.aggregateId,
        message.checksum,
        message.processedAt,
      ],
    );
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM inbox_messages WHERE event_id = $1`,
      [eventId],
    );
    return rows.map(this.toMessage);
  }

  async countProcessed(since: Date): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::integer AS count FROM inbox_messages WHERE processed_at >= $1`,
      [since],
    );
    return rows[0].count as number;
  }

  private toMessage(row: Record<string, unknown>): InboxMessage {
    return {
      eventId: row.event_id as string,
      eventType: row.event_type as string,
      handlerName: row.handler_name as string,
      aggregateId: row.aggregate_id as string,
      checksum: row.checksum as string,
      processedAt: new Date(row.processed_at as string),
    };
  }
}
