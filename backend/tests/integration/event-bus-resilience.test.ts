/**
 * Event Bus Resilience Tests
 * Tests at-least-once delivery, DLQ, retry logic, duplicate suppression.
 * Uses in-memory implementations (unit-level) to simulate resilience scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResilientEventBus } from '../../src/test-utils/in-memory-event-bus';
import { InMemoryInboxStore } from '../../src/test-utils/in-memory-inbox-store';
import type { SystemEvent } from '../../src/shared/events/DomainEvent';
import type { EventHandler } from '../../src/shared/events/event-handler';

const makeDepositEvent = (txId = 'tx-001'): SystemEvent => ({
  type: 'DEPOSIT_DETECTED',
  txId,
  address: 'bc1qtest',
  amount: 0.01,
  blockHeight: 800000,
  timestamp: new Date(),
});

describe('EventBus resilience', () => {
  let inbox: InMemoryInboxStore;
  let bus: ResilientEventBus;

  beforeEach(() => {
    inbox = new InMemoryInboxStore();
    bus = new ResilientEventBus(inbox, { maxRetries: 2, retryDelayMs: 1 });
  });

  it('delivers an event to a registered handler', async () => {
    const received: SystemEvent[] = [];
    const handler: EventHandler<any> = {
      handlerName: 'test-handler',
      handle: async (e) => { received.push(e); },
    };
    bus.subscribe('DEPOSIT_DETECTED', handler);

    await bus.publish(makeDepositEvent());

    expect(received).toHaveLength(1);
    expect((received[0] as any).txId).toBe('tx-001');
  });

  it('retries on transient failures and succeeds on 2nd attempt', async () => {
    let attempts = 0;
    const handler: EventHandler<any> = {
      handlerName: 'flaky-handler',
      handle: async () => {
        attempts++;
        if (attempts < 2) throw new Error('transient');
      },
    };
    bus.subscribe('DEPOSIT_DETECTED', handler);

    await bus.publish(makeDepositEvent());

    expect(attempts).toBe(2);
    expect(bus.getDeadLetterQueue()).toHaveLength(0);
  });

  it('moves event to DLQ after max retries exhausted', async () => {
    const handler: EventHandler<any> = {
      handlerName: 'always-fails',
      handle: async () => { throw new Error('permanent error'); },
    };
    bus.subscribe('DEPOSIT_DETECTED', handler);

    await bus.publish(makeDepositEvent());

    expect(bus.getDeadLetterQueue()).toHaveLength(1);
    expect(bus.getDeadLetterQueue()[0].handlerName).toBe('always-fails');
    expect(bus.getDeadLetterQueue()[0].retryCount).toBe(2);
  });

  it('deduplicates events with same eventId via inbox', async () => {
    const received: SystemEvent[] = [];
    const handler: EventHandler<any> = {
      handlerName: 'dedup-handler',
      handle: async (e) => { received.push(e); },
    };
    bus.subscribe('DEPOSIT_DETECTED', handler);

    const event = { ...makeDepositEvent(), eventId: 'same-id' } as any;
    await bus.publish(event);
    await bus.publish(event); // duplicate — should be suppressed

    expect(received).toHaveLength(1);
  });

  it('retries a dead-letter event successfully', async () => {
    let shouldFail = true;
    const handler: EventHandler<any> = {
      handlerName: 'retry-handler',
      handle: async () => {
        if (shouldFail) throw new Error('not yet');
      },
    };
    bus.subscribe('DEPOSIT_DETECTED', handler);
    const event = { ...makeDepositEvent(), eventId: 'dlq-evt-1' } as any;
    await bus.publish(event);

    expect(bus.getDeadLetterQueue()).toHaveLength(1);

    shouldFail = false;
    const retried = await bus.retryDeadLetter('dlq-evt-1');

    expect(retried).toBe(true);
    expect(bus.getDeadLetterQueue()).toHaveLength(0);
  });

  it('handles process restart simulation (new bus instance, inbox persistence)', async () => {
    // Simulate: event was processed before restart; inbox remembers it
    await inbox.save({
      eventId: 'pre-restart-evt',
      eventType: 'DEPOSIT_DETECTED',
      handlerName: 'idempotent-handler',
      aggregateId: '',
      checksum: '',
      processedAt: new Date(),
    });

    const received: SystemEvent[] = [];
    const bus2 = new ResilientEventBus(inbox, { maxRetries: 1, retryDelayMs: 1 });
    const handler: EventHandler<any> = {
      handlerName: 'idempotent-handler',
      handle: async (e) => { received.push(e); },
    };
    bus2.subscribe('DEPOSIT_DETECTED', handler);

    const event = { ...makeDepositEvent(), eventId: 'pre-restart-evt' } as any;
    await bus2.publish(event);

    // Should NOT be processed again after restart
    expect(received).toHaveLength(0);
  });
});
