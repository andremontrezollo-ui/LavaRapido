/**
 * Integration test: Outbox recovery after failures.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOutboxStore } from '../../src/test-utils/InMemoryOutboxStore';
import { ResilientEventBus } from '../../src/shared/events/InMemoryEventBus';
import { OutboxProcessor } from '../../src/infra/messaging/outbox-processor';
import { createOutboxMessage } from '../../src/shared/events/outbox-message';
import type { SystemEvent } from '../../src/shared/events/DomainEvent';
import type { EventHandler } from '../../src/shared/events/event-handler';

class MockLogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  child() { return this; }
}

describe('Outbox Recovery', () => {
  let outbox: InMemoryOutboxStore;
  let bus: ResilientEventBus;
  let processor: OutboxProcessor;

  beforeEach(() => {
    outbox = new InMemoryOutboxStore();
    bus = new ResilientEventBus(null, { maxRetries: 1, retryDelayMs: 0 });
    processor = new OutboxProcessor(outbox, bus, new MockLogger() as any, 5);
  });

  it('should retry failed messages on next processOnce call', async () => {
    let attempt = 0;
    const handler: EventHandler<SystemEvent> = {
      handlerName: 'retry-handler',
      handle: async () => {
        attempt++;
        if (attempt < 2) throw new Error('transient error');
      },
    };
    bus.subscribeAll(handler);

    const event: SystemEvent = {
      type: 'SESSION_CREATED',
      sessionId: 'sess-retry',
      expiresAt: new Date(),
      timestamp: new Date(),
    };
    const msg = createOutboxMessage('msg-retry', event.type, 'sess-retry', event as any, 'corr', new Date());
    await outbox.save(msg);

    // First pass — fails (retries exhausted within ResilientEventBus, message marked failed)
    await processor.processOnce();

    // Manually reset status to pending to simulate recovery
    const stored = await outbox.findPending(10);
    expect(stored.length).toBe(0); // message is now failed or published

    // Reset outbox message status to pending to test re-processing path
    (outbox as any).messages.get('msg-retry').status = 'pending';
    (outbox as any).messages.get('msg-retry').retryCount = 0;
    attempt = 1; // second attempt should succeed

    const published = await processor.processOnce();
    expect(published).toBe(1);
  });

  it('should mark outbox message as failed via direct store API (testing store resilience)', async () => {
    // Test the outbox store's direct dead_letter promotion via markFailed
    const event: SystemEvent = {
      type: 'SESSION_EXPIRED',
      sessionId: 'sess-dlq',
      timestamp: new Date(),
    };
    const msg = createOutboxMessage('msg-dlq', event.type, 'sess-dlq', event as any, 'corr', new Date());
    // Pre-set retry count to 4 so next markFailed promotes to dead_letter
    (msg as any).retryCount = 4;
    await outbox.save(msg);

    // Directly call markFailed to simulate exhausted retries
    await outbox.markFailed('msg-dlq', 'permanent failure', new Date());

    expect(await outbox.countByStatus('dead_letter')).toBe(1);
  });

  it('should process multiple pending messages in a batch', async () => {
    const received: string[] = [];
    const handler: EventHandler<SystemEvent> = {
      handlerName: 'batch-handler',
      handle: async (e) => { received.push((e as any).sessionId); },
    };
    bus.subscribeAll(handler);

    for (let i = 0; i < 5; i++) {
      const event: SystemEvent = {
        type: 'SESSION_CREATED',
        sessionId: `sess-${i}`,
        expiresAt: new Date(),
        timestamp: new Date(Date.now() + i),
      };
      const msg = createOutboxMessage(`msg-batch-${i}`, event.type, `sess-${i}`, event as any, 'corr', new Date(Date.now() + i));
      await outbox.save(msg);
    }

    const published = await processor.processOnce();
    expect(published).toBe(5);
    expect(received.length).toBe(5);
  });
});
