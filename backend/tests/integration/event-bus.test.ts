/**
 * Integration tests for DurableEventBus
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DurableEventBus } from '../../src/infra/messaging/durable-event-bus';
import type { OutboxStore, OutboxMessage, OutboxStatus } from '../../src/shared/events/outbox-message';
import type { InboxStore, InboxMessage } from '../../src/shared/events/inbox-message';
import type { SystemEvent } from '../../src/shared/events/DomainEvent';

function makeMockOutbox(): OutboxStore & { messages: OutboxMessage[] } {
  const messages: OutboxMessage[] = [];
  return {
    messages,
    async save(msg) { messages.push({ ...msg }); },
    async findPending(limit) { return messages.filter(m => m.status === 'pending').slice(0, limit); },
    async markPublished(id, now) {
      const m = messages.find(x => x.id === id);
      if (m) { m.status = 'published'; m.publishedAt = now; }
    },
    async markFailed(id, error, now) {
      const m = messages.find(x => x.id === id);
      if (m) { m.status = 'failed'; m.error = error; m.lastAttemptAt = now; }
    },
    async markDeadLetter(id, now) {
      const m = messages.find(x => x.id === id);
      if (m) { m.status = 'dead_letter'; m.lastAttemptAt = now; }
    },
    async countByStatus(status: OutboxStatus) {
      return messages.filter(m => m.status === status).length;
    },
  };
}

function makeMockInbox(): InboxStore & { processed: InboxMessage[] } {
  const processed: InboxMessage[] = [];
  return {
    processed,
    async exists(eventId, handlerName) {
      return processed.some(m => m.eventId === eventId && m.handlerName === handlerName);
    },
    async save(msg) { processed.push({ ...msg }); },
    async findByEventId(eventId) {
      return processed.filter(m => m.eventId === eventId);
    },
    async countProcessed(since) {
      return processed.filter(m => m.processedAt >= since).length;
    },
  };
}

const sampleEvent: SystemEvent = {
  type: 'DEPOSIT_DETECTED',
  txId: 'tx-1',
  address: 'addr-1',
  amount: 100,
  blockHeight: 100,
  timestamp: new Date(),
  aggregateId: 'agg-1',
  correlationId: 'corr-1',
};

describe('DurableEventBus', () => {
  let outbox: ReturnType<typeof makeMockOutbox>;
  let inbox: ReturnType<typeof makeMockInbox>;
  let bus: DurableEventBus;

  beforeEach(() => {
    outbox = makeMockOutbox();
    inbox = makeMockInbox();
    bus = new DurableEventBus(outbox, inbox);
  });

  it('persists event to outbox before publishing', async () => {
    await bus.publish(sampleEvent);
    expect(outbox.messages).toHaveLength(1);
    expect(outbox.messages[0].eventType).toBe('DEPOSIT_DETECTED');
    expect(outbox.messages[0].status).toBe('pending');
  });

  it('delivers event to subscribed handler', async () => {
    const handler = vi.fn();
    bus.subscribe('DEPOSIT_DETECTED', {
      handlerName: 'test-handler',
      async handle(e) { handler(e); },
    });
    await bus.publish(sampleEvent);
    expect(handler).toHaveBeenCalledWith(sampleEvent);
  });

  it('publishes all events and persists each to outbox', async () => {
    const event2: SystemEvent = {
      type: 'DEPOSIT_CONFIRMED',
      txId: 'tx-2',
      confirmations: 6,
      timestamp: new Date(),
    };
    await bus.publishAll([sampleEvent, event2]);
    expect(outbox.messages).toHaveLength(2);
  });

  it('returns DLQ items after handler failure', async () => {
    bus.subscribe('DEPOSIT_DETECTED', {
      handlerName: 'failing-handler',
      async handle() { throw new Error('handler error'); },
    });
    await bus.publish(sampleEvent);
    const dlq = bus.getDeadLetterQueue();
    expect(dlq.length).toBeGreaterThan(0);
    expect(dlq[0].handlerName).toBe('failing-handler');
  });

  it('subscribeAll receives every event type', async () => {
    const received: string[] = [];
    bus.subscribeAll({ handlerName: 'all-handler', async handle(e) { received.push(e.type); } });
    await bus.publish(sampleEvent);
    expect(received).toContain('DEPOSIT_DETECTED');
  });
});
