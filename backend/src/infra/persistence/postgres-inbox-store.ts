import { Pool } from 'pg';
import type { InboxMessage, InboxStore } from '../../shared/events/inbox-message';

export class PostgresInboxStore implements InboxStore {
  constructor(private readonly pool: Pool) {}

  async exists(eventId: string, handlerName: string): Promise<boolean> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM inbox_messages WHERE event_id=$1 AND handler_name=$2`,
      [eventId, handlerName],
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  async save(message: InboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO inbox_messages (event_id, event_type, handler_name, aggregate_id, processed_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id, handler_name) DO NOTHING`,
      [
        message.eventId,
        message.eventType,
        message.handlerName,
        message.aggregateId,
        message.processedAt,
      ],
    );
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    const result = await this.pool.query<{
      event_id: string;
      event_type: string;
      handler_name: string;
      aggregate_id: string;
      processed_at: Date;
    }>(
      `SELECT event_id, event_type, handler_name, aggregate_id, processed_at
       FROM inbox_messages WHERE event_id=$1`,
      [eventId],
    );
    return result.rows.map(row => ({
      eventId: row.event_id,
      eventType: row.event_type,
      handlerName: row.handler_name,
      aggregateId: row.aggregate_id,
      processedAt: row.processed_at,
      checksum: '',
    }));
  }

  async countProcessed(since: Date): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM inbox_messages WHERE processed_at >= $1`,
      [since],
    );
    return parseInt(result.rows[0].count, 10);
  }
}
