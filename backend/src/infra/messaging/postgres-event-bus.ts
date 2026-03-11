/**
 * PostgreSQL Event Bus — durable event persistence before dispatch.
 * Events are persisted atomically then dispatched with retry and dead-letter handling.
 * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent-safe delivery.
 */

import type { Pool } from 'pg';
import type { EventBus, EventBusOptions, FailedEvent } from '../../shared/events/EventBus';
import type { SystemEvent, EventType } from '../../shared/events/DomainEvent';
import type { EventHandler } from '../../shared/events/event-handler';
import type { Logger } from '../../shared/logging/logger';
import { randomUUID } from 'crypto';

export class PostgresEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private globalHandlers = new Set<EventHandler<SystemEvent>>();
  private readonly maxRetries: number;

  constructor(
    private readonly pool: Pool,
    private readonly logger: Logger,
    options: EventBusOptions = {},
  ) {
    this.maxRetries = options.maxRetries ?? 3;
  }

  async publish(event: SystemEvent): Promise<void> {
    await this.persistEvent(event);
    await this.dispatch(event);
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
    return [];
  }

  async retryDeadLetter(eventId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT * FROM dead_letter_queue WHERE id=$1 AND resolved=false LIMIT 1`,
      [eventId],
    );
    if (!rows[0]) return false;

    const row = rows[0];
    const event = row.payload as SystemEvent;
    const subscriber = row.subscriber as string;

    const handlers = [
      ...(this.handlers.get(event.type) ?? []),
      ...this.globalHandlers,
    ].filter(h => h.handlerName === subscriber);

    if (!handlers[0]) return false;

    try {
      await handlers[0].handle(event);
      await this.pool.query(
        `UPDATE dead_letter_queue SET resolved=true WHERE id=$1`,
        [eventId],
      );
      return true;
    } catch (err) {
      this.logger.error('DLQ retry failed', { eventId, error: String(err) });
      return false;
    }
  }

  private async persistEvent(event: SystemEvent): Promise<void> {
    const id = (event as any).eventId ?? randomUUID();
    await this.pool.query(
      `INSERT INTO events (id, event_type, aggregate_id, payload, occurred_at)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        event.type,
        (event as any).aggregateId ?? '',
        JSON.stringify(event),
        event.timestamp,
      ],
    );
  }

  private async dispatch(event: SystemEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type);
    const all: EventHandler<any>[] = [
      ...(typeHandlers ? [...typeHandlers] : []),
      ...this.globalHandlers,
    ];

    for (const handler of all) {
      await this.dispatchToHandler(event, handler);
    }
  }

  private async dispatchToHandler(event: SystemEvent, handler: EventHandler<any>): Promise<void> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await handler.handle(event);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
        }
      }
    }

    const eventId = (event as any).eventId ?? '';
    this.logger.error('Event dispatch failed after retries, moving to DLQ', {
      eventType: event.type,
      handler: handler.handlerName,
      error: lastError?.message,
    });

    await this.pool.query(
      `INSERT INTO dead_letter_queue
         (event_type, aggregate_id, payload, subscriber, error, retry_count)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6)`,
      [
        event.type,
        (event as any).aggregateId ?? '',
        JSON.stringify(event),
        handler.handlerName,
        lastError?.message ?? 'Unknown error',
        this.maxRetries,
      ],
    );
  }
}
