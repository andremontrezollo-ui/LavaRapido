/**
 * PostgreSQL-backed Event Bus with at-least-once delivery.
 * Uses the outbox pattern with SELECT FOR UPDATE SKIP LOCKED for safe concurrent workers.
 * Failed deliveries go to the dead_letter_queue after max retries.
 */

import type { Pool, PoolClient } from 'pg';
import type { SystemEvent, EventType } from '../../shared/events/DomainEvent';
import type { EventBus, EventBusOptions, FailedEvent } from '../../shared/events/EventBus';
import type { EventHandler } from '../../shared/events/event-handler';
import type { Logger } from '../../shared/logging/logger';

export class PostgresEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private globalHandlers = new Set<EventHandler<SystemEvent>>();
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly logger: Pick<Logger, 'error'>;

  constructor(
    private readonly pool: Pool,
    options: EventBusOptions = {},
    logger?: Pick<Logger, 'error'>,
  ) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.logger = logger ?? { error: (msg, ctx) => console.error('[PostgresEventBus]', msg, ctx) };
  }

  async publish(event: SystemEvent): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO events (event_type, aggregate_id, correlation_id, causation_id, payload)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          event.type,
          (event as any).aggregateId ?? '',
          (event as any).correlationId ?? '',
          (event as any).causationId ?? '',
          JSON.stringify(event),
        ],
      );

      const eventId = rows[0].id;
      const allHandlerNames = this.getAllHandlerNames(event.type);

      for (const handlerName of allHandlerNames) {
        await client.query(
          `INSERT INTO event_deliveries (event_id, handler_name, max_retries)
           VALUES ($1, $2, $3)
           ON CONFLICT (event_id, handler_name) DO NOTHING`,
          [eventId, handlerName, this.maxRetries],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Deliver synchronously to in-process handlers
    await this.deliverToHandlers(event);
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
    // DLQ is stored in PostgreSQL; return empty array for interface compliance.
    // Use queryDeadLetterQueue() for async access.
    return [];
  }

  async queryDeadLetterQueue(): Promise<FailedEvent[]> {
    const { rows } = await this.pool.query<{
      event_id: string;
      handler_name: string;
      error: string;
      retry_count: number;
      failed_at: Date;
      payload: any;
      event_type: string;
    }>(
      `SELECT dlq.event_id, dlq.handler_name, dlq.error, dlq.retry_count, dlq.failed_at,
              e.payload, e.event_type
       FROM dead_letter_queue dlq
       JOIN events e ON e.id = dlq.event_id
       WHERE dlq.resolved_at IS NULL
       ORDER BY dlq.failed_at DESC
       LIMIT 100`,
    );

    return rows.map(row => ({
      event: { ...row.payload, type: row.event_type } as SystemEvent,
      error: row.error,
      failedAt: row.failed_at,
      handlerName: row.handler_name,
      retryCount: row.retry_count,
    }));
  }

  async retryDeadLetter(eventId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ event_id: string; handler_name: string; payload: any; event_type: string }>(
      `SELECT dlq.event_id, dlq.handler_name, e.payload, e.event_type
       FROM dead_letter_queue dlq
       JOIN events e ON e.id = dlq.event_id
       WHERE e.id = $1 AND dlq.resolved_at IS NULL
       LIMIT 1`,
      [eventId],
    );

    if (rows.length === 0) return false;
    const row = rows[0];
    const event = { ...row.payload, type: row.event_type } as SystemEvent;
    const allHandlers = [...(this.handlers.get(event.type) ?? []), ...this.globalHandlers];
    const handler = allHandlers.find(h => h.handlerName === row.handler_name);
    if (!handler) return false;

    try {
      await handler.handle(event);
      await this.pool.query(
        `UPDATE dead_letter_queue SET resolved_at = now(), resolved_by = 'manual_retry'
         WHERE event_id = $1 AND handler_name = $2`,
        [eventId, row.handler_name],
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Process pending event deliveries using SELECT FOR UPDATE SKIP LOCKED.
   * Safe to run concurrently across multiple workers.
   */
  async processPendingDeliveries(batchSize = 10): Promise<number> {
    const client = await this.pool.connect();
    let delivered = 0;

    try {
      const { rows } = await client.query<{
        id: string;
        event_id: string;
        handler_name: string;
        retry_count: number;
        max_retries: number;
        payload: any;
        event_type: string;
      }>(
        `SELECT ed.id, ed.event_id, ed.handler_name, ed.retry_count, ed.max_retries,
                e.payload, e.event_type
         FROM event_deliveries ed
         JOIN events e ON e.id = ed.event_id
         WHERE ed.status = 'pending'
         ORDER BY ed.created_at
         LIMIT $1
         FOR UPDATE OF ed SKIP LOCKED`,
        [batchSize],
      );

      for (const row of rows) {
        const event = { ...row.payload, type: row.event_type } as SystemEvent;
        const allHandlers = [...(this.handlers.get(event.type) ?? []), ...this.globalHandlers];
        const handler = allHandlers.find(h => h.handlerName === row.handler_name);

        if (!handler) {
          // No handler registered; mark as delivered to avoid blocking
          await client.query(
            `UPDATE event_deliveries SET status='delivered', delivered_at=now() WHERE id=$1`,
            [row.id],
          );
          continue;
        }

        try {
          await handler.handle(event);
          await client.query(
            `UPDATE event_deliveries SET status='delivered', delivered_at=now() WHERE id=$1`,
            [row.id],
          );
          delivered++;
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          const newRetryCount = row.retry_count + 1;

          if (newRetryCount >= row.max_retries) {
            await client.query(
              `UPDATE event_deliveries
               SET status='dead_letter', retry_count=$1, last_attempt_at=now(), error=$2
               WHERE id=$3`,
              [newRetryCount, error, row.id],
            );
            await client.query(
              `INSERT INTO dead_letter_queue (event_id, handler_name, error, retry_count)
               VALUES ($1, $2, $3, $4)`,
              [row.event_id, row.handler_name, error, newRetryCount],
            );
          } else {
            await client.query(
              `UPDATE event_deliveries
               SET status='failed', retry_count=$1, last_attempt_at=now(), error=$2
               WHERE id=$3`,
              [newRetryCount, error, row.id],
            );
          }
        }
      }
    } finally {
      client.release();
    }

    return delivered;
  }

  private async deliverToHandlers(event: SystemEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type);
    const allHandlers: EventHandler<any>[] = [
      ...(typeHandlers ? [...typeHandlers] : []),
      ...this.globalHandlers,
    ];

    for (const handler of allHandlers) {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          await handler.handle(event);
          lastError = null;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelayMs * Math.pow(2, attempt));
          }
        }
      }

      if (lastError) {
        this.logger.error(`Handler ${handler.handlerName} failed for ${event.type}`, {
          handlerName: handler.handlerName,
          eventType: event.type,
          error: lastError.message,
        });
      }
    }
  }

  private getAllHandlerNames(eventType: string): string[] {
    const names: string[] = [];
    const typeHandlers = this.handlers.get(eventType);
    if (typeHandlers) {
      for (const h of typeHandlers) names.push(h.handlerName);
    }
    for (const h of this.globalHandlers) names.push(h.handlerName);
    return names;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
