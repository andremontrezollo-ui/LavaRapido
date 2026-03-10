/**
 * PostgreSQL Inbox Store
 * Production implementation of InboxStore backed by the `inbox_messages` table.
 */

import { Pool } from 'pg';
import type { InboxMessage, InboxStore } from '../../shared/events/inbox-message';

interface InboxRow {
  event_id: string;
  event_type: string;
  handler_name: string;
  aggregate_id: string;
  processed_at: Date;
  checksum: string;
}

function rowToMessage(row: InboxRow): InboxMessage {
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    handlerName: row.handler_name,
    aggregateId: row.aggregate_id,
    processedAt: row.processed_at,
    checksum: row.checksum,
  };
}

export class PostgresInboxStore implements InboxStore {
  constructor(private readonly pool: Pool) {}

  async exists(eventId: string, handlerName: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM inbox_messages WHERE event_id = $1 AND handler_name = $2) AS exists',
      [eventId, handlerName],
    );
    return rows[0]?.exists ?? false;
  }

  async save(message: InboxMessage): Promise<void> {
    await this.pool.query(`
      INSERT INTO inbox_messages
        (event_id, event_type, handler_name, aggregate_id, processed_at, checksum)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (event_id, handler_name) DO NOTHING
    `, [
      message.eventId,
      message.eventType,
      message.handlerName,
      message.aggregateId,
      message.processedAt,
      message.checksum,
    ]);
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    const { rows } = await this.pool.query<InboxRow>(
      'SELECT * FROM inbox_messages WHERE event_id = $1',
      [eventId],
    );
    return rows.map(rowToMessage);
  }

  async countProcessed(since: Date): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM inbox_messages WHERE processed_at >= $1',
      [since],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
