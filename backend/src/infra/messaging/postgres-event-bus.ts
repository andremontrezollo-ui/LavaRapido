/**
 * PostgreSQL-backed Durable EventBus
 *
 * Implements the outbox pattern with at-least-once delivery:
 *  1. Events are persisted to the `events` table before being dispatched.
 *  2. A polling processor reads pending rows using SELECT FOR UPDATE SKIP LOCKED
 *     to avoid duplicate processing across multiple instances.
 *  3. In-process subscribers receive the events after successful DB commit.
 */

import { Pool } from 'pg';
import type { SystemEvent, EventType } from '../../shared/events/DomainEvent';
import type { EventBus, EventBusOptions, FailedEvent } from '../../shared/events/EventBus';
import type { EventHandler } from '../../shared/events/event-handler';
import type { Logger } from '../../shared/logging';
import { v4 as uuidv4 } from 'uuid';

interface EventRow {
  id: string;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  causation_id: string;
  source: string;
  status: string;
  retry_count: number;
  max_retries: number;
  last_attempt_at: Date | null;
  published_at: Date | null;
  error: string | null;
  created_at: Date;
}

export class PostgresEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<any>>>();
  private readonly globalHandlers = new Set<EventHandler<SystemEvent>>();
  private readonly deadLetterQueue: FailedEvent[] = [];
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly pool: Pool,
    private readonly logger: Logger,
    options: EventBusOptions & { pollingIntervalMs?: number } = {},
  ) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 200;
  }

  // ─── EventBus contract ───────────────────────────────────────────────────

  async publish(event: SystemEvent): Promise<void> {
    await this.persistEvent(event);
    await this.dispatchToHandlers(event);
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
    this.handlers.get(eventType)!.add(handler as EventHandler<any>);
    return () => { this.handlers.get(eventType)?.delete(handler as EventHandler<any>); };
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
      f => (f.event as any).eventId === eventId || (f.event as any).aggregateId === eventId,
    );
    if (idx === -1) return false;
    const { event, handlerName } = this.deadLetterQueue[idx];
    const allHandlers = [...(this.handlers.get(event.type) ?? []), ...this.globalHandlers];
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

  // ─── Outbox polling ──────────────────────────────────────────────────────

  /**
   * Process a single batch of pending events from the `events` table.
   * Uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent processing.
   */
  async processOnce(batchSize = 20): Promise<number> {
    const client = await this.pool.connect();
    let processed = 0;

    try {
      await client.query('BEGIN');

      const { rows } = await client.query<EventRow>(`
        SELECT *
        FROM   events
        WHERE  status IN ('pending', 'failed')
          AND  retry_count < max_retries
        ORDER BY created_at ASC
        LIMIT  $1
        FOR UPDATE SKIP LOCKED
      `, [batchSize]);

      for (const row of rows) {
        try {
          const event = this.rowToEvent(row);
          await this.dispatchToHandlers(event);

          await client.query(`
            UPDATE events
            SET    status = 'published',
                   published_at = NOW(),
                   last_attempt_at = NOW()
            WHERE  id = $1
          `, [row.id]);

          processed++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const nextRetry = (row.retry_count ?? 0) + 1;
          const isDead = nextRetry >= row.max_retries;

          await client.query(`
            UPDATE events
            SET    status = $1,
                   retry_count = $2,
                   last_attempt_at = NOW(),
                   error = $3
            WHERE  id = $4
          `, [isDead ? 'dead_letter' : 'failed', nextRetry, errorMsg, row.id]);

          this.logger.error('[postgres-event-bus] dispatch failed', {
            eventId: row.id,
            eventType: row.event_type,
            retryCount: nextRetry,
            error: errorMsg,
          });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error('[postgres-event-bus] processOnce error', { error: String(err) });
      throw err;
    } finally {
      client.release();
    }

    return processed;
  }

  /** Start a background polling loop. */
  startPolling(intervalMs = 5_000): void {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(async () => {
      try {
        await this.processOnce();
      } catch (err) {
        this.logger.error('[postgres-event-bus] polling error', { error: String(err) });
      }
    }, intervalMs);
  }

  /** Stop the background polling loop. */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /** Return current backlog counts for health checks. */
  async getBacklog(): Promise<Record<string, number>> {
    const { rows } = await this.pool.query<{ status: string; total: string }>(
      `SELECT status, COUNT(*) AS total FROM events GROUP BY status`,
    );
    return Object.fromEntries(rows.map(r => [r.status, parseInt(r.total, 10)]));
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private async persistEvent(event: SystemEvent): Promise<void> {
    const id = (event as any).eventId ?? uuidv4();
    const aggregateId = (event as any).aggregateId ?? '';
    const correlationId = (event as any).correlationId ?? '';
    const causationId = (event as any).causationId ?? '';
    const source = (event as any).source ?? '';

    await this.pool.query(`
      INSERT INTO events
        (id, event_type, aggregate_id, payload, correlation_id, causation_id, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [id, event.type, aggregateId, JSON.stringify(event), correlationId, causationId, source]);
  }

  private rowToEvent(row: EventRow): SystemEvent {
    const payload = row.payload as Record<string, unknown>;
    // Restore Date objects from ISO strings
    if (typeof payload.timestamp === 'string') {
      payload.timestamp = new Date(payload.timestamp);
    }
    return payload as unknown as SystemEvent;
  }

  private async dispatchToHandlers(event: SystemEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        await this.executeWithRetry(event, handler);
      }
    }
    for (const handler of this.globalHandlers) {
      await this.executeWithRetry(event, handler);
    }
  }

  private async executeWithRetry(event: SystemEvent, handler: EventHandler<any>): Promise<void> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await handler.handle(event);
        return;
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
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
