import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryInboxStore } from '../../src/test-utils/InMemoryInboxStore';
import { ResilientEventBus } from '../../src/shared/events/InMemoryEventBus';
import type { EventHandler } from '../../src/shared/events/event-handler';
import type { SystemEvent } from '../../src/shared/events/DomainEvent';
import { createOutboxMessage } from '../../src/shared/events/outbox-message';
import { InMemoryOutboxStore } from '../../src/test-utils/InMemoryOutboxStore';
import { OutboxProcessor } from '../../src/infra/messaging/outbox-processor';

class MockLogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  child() { return this; }
}

describe('Durable EventBus — outbox delivery', () => {
  let inbox: InMemoryInboxStore;
  let outbox: InMemoryOutboxStore;
  let bus: ResilientEventBus;
  let processor: OutboxProcessor;

  beforeEach(() => {
    inbox = new InMemoryInboxStore();
    outbox = new InMemoryOutboxStore();
    bus = new ResilientEventBus(inbox, { maxRetries: 2, retryDelayMs: 10 });
    processor = new OutboxProcessor(outbox, bus, new MockLogger() as any, 10);
  });

  it('should deliver event through outbox processor', async () => {
    const received: SystemEvent[] = [];

    const handler: EventHandler<SystemEvent> = {
      handlerName: 'test-handler',
      handle: async (event) => { received.push(event); },
    };
    bus.subscribeAll(handler);

    const event: SystemEvent = {
      type: 'SESSION_CREATED',
      sessionId: 'sess-1',
      expiresAt: new Date(),
      timestamp: new Date(),
    };

    const msg = createOutboxMessage('msg-1', event.type, 'sess-1', event as any, 'corr-1', new Date());
    await outbox.save(msg);

    const published = await processor.processOnce();

    expect(published).toBe(1);
    expect(received.length).toBe(1);
    expect(received[0].type).toBe('SESSION_CREATED');
    expect(await outbox.countByStatus('published')).toBe(1);
  });

  it('should mark outbox message as published even when event bus handler fails (bus handles DLQ)', async () => {
    // The outbox processor hands events to the bus; the bus handles retries/DLQ internally.
    // The outbox message is marked published as soon as the bus accepts it.
    const handler: EventHandler<SystemEvent> = {
      handlerName: 'failing-handler',
      handle: async () => { throw new Error('handler error'); },
    };
    bus.subscribeAll(handler);

    const event: SystemEvent = {
      type: 'SESSION_EXPIRED',
      sessionId: 'sess-2',
      timestamp: new Date(),
    };

    const msg = createOutboxMessage('msg-2', event.type, 'sess-2', event as any, 'corr-2', new Date());
    await outbox.save(msg);

    const published = await processor.processOnce();

    // Message is published to bus (bus accepted it); the handler failure goes to bus DLQ
    expect(published).toBe(1);
    expect(await outbox.countByStatus('published')).toBe(1);
    // Bus DLQ should contain the failed delivery
    expect(bus.getDeadLetterQueue().length).toBeGreaterThan(0);
  });

  it('should deduplicate events using inbox', async () => {
    let callCount = 0;
    const handler: EventHandler<SystemEvent> = {
      handlerName: 'dedup-handler',
      handle: async () => { callCount++; },
    };
    bus.subscribeAll(handler);

    const eventId = 'evt-dedup-1';
    const event: SystemEvent & { eventId: string } = {
      type: 'SESSION_CREATED',
      sessionId: 'sess-3',
      expiresAt: new Date(),
      timestamp: new Date(),
      eventId,
    };

    const msg1 = createOutboxMessage('msg-3a', event.type, 'sess-3', event as any, 'corr-3', new Date());
    const msg2 = createOutboxMessage('msg-3b', event.type, 'sess-3', event as any, 'corr-3', new Date());
    await outbox.save(msg1);
    await outbox.save(msg2);

    await processor.processOnce();
    await processor.processOnce();

    expect(callCount).toBe(1);
  });
});
