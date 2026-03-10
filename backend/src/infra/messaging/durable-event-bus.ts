import type { EventBus, EventBusOptions, FailedEvent } from '../../shared/events/EventBus';
import type { SystemEvent, EventType } from '../../shared/events/DomainEvent';
import type { EventHandler } from '../../shared/events/event-handler';
import type { OutboxStore } from '../../shared/events/outbox-message';
import type { InboxStore } from '../../shared/events/inbox-message';
import { ResilientEventBus } from '../../shared/events/InMemoryEventBus';
import { createOutboxMessage } from '../../shared/events/outbox-message';

export class DurableEventBus implements EventBus {
  private readonly inner: ResilientEventBus;

  constructor(
    private readonly outbox: OutboxStore,
    inbox: InboxStore,
    options?: EventBusOptions,
  ) {
    this.inner = new ResilientEventBus(inbox, options);
  }

  async publish(event: SystemEvent): Promise<void> {
    const outboxMsg = createOutboxMessage(
      (event as any).eventId ?? crypto.randomUUID(),
      event.type,
      (event as any).aggregateId ?? '',
      event as unknown as Record<string, unknown>,
      (event as any).correlationId ?? '',
      new Date(),
    );
    await this.outbox.save(outboxMsg);
    await this.inner.publish(event);
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
    return this.inner.subscribe(eventType, handler);
  }

  subscribeAll(handler: EventHandler<SystemEvent>): () => void {
    return this.inner.subscribeAll(handler);
  }

  getDeadLetterQueue(): readonly FailedEvent[] {
    return this.inner.getDeadLetterQueue();
  }

  async retryDeadLetter(eventId: string): Promise<boolean> {
    return this.inner.retryDeadLetter(eventId);
  }
}
