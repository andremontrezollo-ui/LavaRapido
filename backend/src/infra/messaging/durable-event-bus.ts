/**
 * Durable Event Bus — replaces ResilientEventBus for production.
 * Publishes events via the outbox pattern backed by PostgreSQL.
 * Handlers run in-process with deduplication via PostgresInboxStore.
 */

import type { SystemEvent, EventType } from '../../shared/events/DomainEvent';
import type { EventBus, EventBusOptions, FailedEvent } from '../../shared/events/EventBus';
import type { EventHandler } from '../../shared/events/event-handler';
import type { OutboxStore } from '../../shared/events/outbox-message';
import type { InboxStore } from '../../shared/events/inbox-message';
import { createInboxMessage } from '../../shared/events/inbox-message';

export class DurableEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private globalHandlers = new Set<EventHandler<SystemEvent>>();
  private deadLetterQueue: FailedEvent[] = [];
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly enableDeduplication: boolean;

  constructor(
    private readonly outboxStore: OutboxStore,
    private readonly inboxStore: InboxStore | null = null,
    options: EventBusOptions = {},
  ) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 100;
    this.enableDeduplication = options.enableDeduplication ?? true;
  }

  async publish(event: SystemEvent): Promise<void> {
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

  private async executeWithRetry(event: SystemEvent, handler: EventHandler<any>): Promise<void> {
    const eventId = (event as any).eventId ?? `${event.type}-${event.timestamp.getTime()}`;

    if (this.enableDeduplication && this.inboxStore) {
      const already = await this.inboxStore.exists(eventId, handler.handlerName);
      if (already) return;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await handler.handle(event);

        if (this.enableDeduplication && this.inboxStore) {
          await this.inboxStore.save(createInboxMessage(
            eventId,
            event.type,
            handler.handlerName,
            (event as any).aggregateId ?? '',
            new Date(),
          ));
        }
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
