/**
 * PostgresInboxStore — durable inbox for idempotent event consumption.
 */

import { Pool } from 'pg';
import type { InboxMessage, InboxStore } from '../../shared/events/inbox-message';
import { getPool } from '../database/connection';

export class PostgresInboxStore implements InboxStore {
  constructor(private readonly pool: Pool = getPool()) {}

  async exists(eventId: string, handlerName: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM inbox_messages WHERE event_id=$1 AND handler_name=$2`,
      [eventId, handlerName],
    );
    return parseInt(rows[0]?.count ?? '0', 10) > 0;
  }

  async save(message: InboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO inbox_messages
         (id, event_id, handler_name, aggregate_id, event_type, checksum, processed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (event_id, handler_name) DO NOTHING`,
      [
        message.id,
        message.eventId,
        message.handlerName,
        message.aggregateId,
        message.eventType,
        message.checksum,
        message.processedAt,
      ],
    );
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    const { rows } = await this.pool.query<{
      id: string; event_id: string; handler_name: string;
      aggregate_id: string; event_type: string; checksum: string; processed_at: Date;
    }>(
      `SELECT id, event_id, handler_name, aggregate_id, event_type, checksum, processed_at
       FROM inbox_messages WHERE event_id=$1`,
      [eventId],
    );
    return rows.map(r => ({
      id: r.id,
      eventId: r.event_id,
      handlerName: r.handler_name,
      aggregateId: r.aggregate_id,
      eventType: r.event_type,
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
