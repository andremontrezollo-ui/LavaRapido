/**
 * PostgreSQL-backed Inbox Store.
 * Deduplicates incoming events by (event_id, handler_name).
 */

import type { Pool } from 'pg';
import type { InboxMessage, InboxStore } from '../../shared/events/inbox-message';

export class PostgresInboxStore implements InboxStore {
  constructor(private readonly pool: Pool) {}

  async exists(eventId: string, handlerName: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM inbox_messages
       WHERE event_id=$1 AND handler_name=$2`,
      [eventId, handlerName],
    );
    return parseInt(rows[0]?.count ?? '0', 10) > 0;
  }

  async save(message: InboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO inbox_messages
         (event_id, event_type, handler_name, aggregate_id, checksum, processed_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (event_id, handler_name) DO NOTHING`,
      [
        message.eventId,
        message.eventType,
        message.handlerName,
        message.aggregateId,
        message.checksum,
        message.processedAt,
      ],
    );
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    const { rows } = await this.pool.query<{
      event_id: string; event_type: string; handler_name: string;
      aggregate_id: string; checksum: string; processed_at: Date;
    }>(
      `SELECT event_id, event_type, handler_name, aggregate_id, checksum, processed_at
       FROM inbox_messages WHERE event_id=$1`,
      [eventId],
    );

    return rows.map(r => ({
      eventId: r.event_id,
      eventType: r.event_type,
      handlerName: r.handler_name,
      aggregateId: r.aggregate_id,
      checksum: r.checksum,
      processedAt: r.processed_at,
    }));
  }

  async countProcessed(since: Date): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM inbox_messages WHERE processed_at >= $1`,
      [since],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
