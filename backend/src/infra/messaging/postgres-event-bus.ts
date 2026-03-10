/**
 * PostgresEventBus — durable EventBus backed by PostgreSQL.
 *
 * Events are persisted to the `events` table and delivered at-least-once via
 * polling with SELECT FOR UPDATE SKIP LOCKED.  A background processor reads
 * pending rows, dispatches them to registered handlers, and marks them
 * delivered or dead-lettered after exhausting retries.
 */

import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import type { EventBus, EventBusOptions, FailedEvent } from '../../shared/events/EventBus';
import type { SystemEvent, EventType } from '../../shared/events/DomainEvent';
import type { EventHandler } from '../../shared/events/event-handler';
import type { InboxStore } from '../../shared/events/inbox-message';
import { createInboxMessage } from '../../shared/events/inbox-message';
import type { Logger } from '../../shared/logging/logger';
import { getPool } from '../database/connection';

const MAX_RETRIES = 3;

export class PostgresEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<any>>>();
  private readonly globalHandlers = new Set<EventHandler<SystemEvent>>();
  private readonly deadLetterQueue: FailedEvent[] = [];
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly enableDeduplication: boolean;
  private pollingActive = false;

  constructor(
    private readonly pool: Pool = getPool(),
    private readonly inbox: InboxStore | null = null,
    private readonly logger: Logger | null = null,
    options: EventBusOptions = {},
  ) {
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.enableDeduplication = options.enableDeduplication ?? true;
  }

  // ─── EventBus API ────────────────────────────────────────────────────────

  async publish(event: SystemEvent): Promise<void> {
    const eventId = (event as any).eventId ?? randomUUID();
    await this.pool.query(
      `INSERT INTO events (id, event_type, aggregate_id, correlation_id, payload, status, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        eventId,
        event.type,
        (event as any).aggregateId ?? '',
        (event as any).correlationId ?? '',
        JSON.stringify(event),
      ],
    );
  }

  async publishAll(events: SystemEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe<T extends EventType>(
    eventType: T,
    handler: EventHandler<Extract<SystemEvent, { type: T }>>,
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => { this.handlers.get(eventType)?.delete(handler); };
  }

  subscribeAll(handler: EventHandler<SystemEvent>): () => void {
    this.globalHandlers.add(handler);
    return () => { this.globalHandlers.delete(handler); };
  }

  getDeadLetterQueue(): readonly FailedEvent[] {
    return [...this.deadLetterQueue];
  }

  async retryDeadLetter(eventId: string): Promise<boolean> {
    const idx = this.deadLetterQueue.findIndex(
      f => (f.event as any).eventId === eventId,
    );
    if (idx === -1) return false;
    const { event, handlerName } = this.deadLetterQueue[idx];
    const allHandlers = [
      ...(this.handlers.get(event.type) ?? []),
      ...this.globalHandlers,
    ];
    const handler = allHandlers.find(h => h.handlerName === handlerName);
    if (!handler) return false;
    try {
      await handler.handle(event);
      this.deadLetterQueue.splice(idx, 1);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Polling processor ───────────────────────────────────────────────────

  /** Process one batch of pending events. Returns the number dispatched. */
  async processOnce(batchSize = 10): Promise<number> {
    const client = await this.pool.connect();
    let dispatched = 0;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{
        id: string; event_type: string; payload: string; retry_count: number;
      }>(
        `SELECT id, event_type, payload::text, retry_count
         FROM events
         WHERE status = 'pending'
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [batchSize],
      );
      await client.query('COMMIT');

      for (const row of rows) {
        const event = this.deserializeEvent(row.payload);
        if (!event) continue;

        const typeHandlers = this.handlers.get(row.event_type) ?? new Set<EventHandler<any>>();
        const allHandlers: EventHandler<any>[] = [...typeHandlers, ...this.globalHandlers];

        if (allHandlers.length === 0) {
          await this.markDelivered(row.id);
          continue;
        }

        let anyFailed = false;
        for (const handler of allHandlers) {
          const ok = await this.dispatchToHandler(event, handler, row.id, row.retry_count);
          if (!ok) anyFailed = true;
        }

        if (!anyFailed) {
          await this.markDelivered(row.id);
          dispatched++;
        }
      }
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      this.logger?.error('PostgresEventBus.processOnce error', { error: String(err) });
    } finally {
      client.release();
    }
    return dispatched;
  }

  /** Start background polling loop. */
  async startPolling(intervalMs = 5000): Promise<void> {
    this.pollingActive = true;
    while (this.pollingActive) {
      try {
        await this.processOnce();
      } catch (err) {
        this.logger?.error('PostgresEventBus poll error', { error: String(err) });
      }
      await this.delay(intervalMs);
    }
  }

  stopPolling(): void {
    this.pollingActive = false;
  }

  async pendingCount(): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM events WHERE status='pending'`,
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private deserializeEvent(payload: string): SystemEvent | null {
    try {
      const event = JSON.parse(payload) as SystemEvent;
      if (typeof (event as any).timestamp === 'string') {
        (event as any).timestamp = new Date((event as any).timestamp);
      }
      return event;
    } catch {
      return null;
    }
  }

  private async dispatchToHandler(
    event: SystemEvent,
    handler: EventHandler<any>,
    rowId: string,
    retryCount: number,
  ): Promise<boolean> {
    const eventId = (event as any).eventId ?? rowId;

    if (this.enableDeduplication && this.inbox) {
      const already = await this.inbox.exists(eventId, handler.handlerName);
      if (already) return true;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await handler.handle(event);

        if (this.enableDeduplication && this.inbox) {
          await this.inbox.save(createInboxMessage(
            eventId,
            event.type,
            handler.handlerName,
            (event as any).aggregateId ?? '',
            new Date(),
          ));
        }
        return true;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt));
        }
      }
    }

    this.deadLetterQueue.push({
      event,
      error: lastError?.message ?? 'Unknown error',
      failedAt: new Date(),
      handlerName: handler.handlerName,
      retryCount: this.maxRetries,
    });

    if (retryCount + 1 >= this.maxRetries) {
      await this.pool.query(
        `UPDATE events SET status='dead_letter', retry_count=retry_count+1,
                           last_attempt_at=NOW(), error=$2 WHERE id=$1`,
        [rowId, lastError?.message],
      );
    } else {
      await this.pool.query(
        `UPDATE events SET status='failed', retry_count=retry_count+1,
                           last_attempt_at=NOW(), error=$2 WHERE id=$1`,
        [rowId, lastError?.message],
      );
    }
    return false;
  }

  private async markDelivered(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE events SET status='delivered', delivered_at=NOW() WHERE id=$1`,
      [id],
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
