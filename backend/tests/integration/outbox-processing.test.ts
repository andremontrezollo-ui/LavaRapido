/**
 * Integration test — Outbox processing lifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOutboxStore } from '../../src/test-utils/InMemoryOutboxStore';
import { OutboxProcessor } from '../../src/infra/messaging/outbox-processor';
import { ResilientEventBus } from '../../src/shared/events/InMemoryEventBus';
import { createOutboxMessage } from '../../src/shared/events/outbox-message';
import type { SystemEvent } from '../../src/shared/events/DomainEvent';
import type { Logger } from '../../src/shared/logging';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};

describe('OutboxProcessor — lifecycle', () => {
  let store: InMemoryOutboxStore;
  let bus: ResilientEventBus;
  let processor: OutboxProcessor;

  beforeEach(() => {
    store = new InMemoryOutboxStore();
    bus = new ResilientEventBus(null, { maxRetries: 0, retryDelayMs: 0 });
    processor = new OutboxProcessor(store, bus, noopLogger, 5);
  });

  it('processes a batch up to the configured batch size', async () => {
    const dispatched: string[] = [];
    bus.subscribeAll({ handlerName: 'counter', handle: async (e) => { dispatched.push(e.type); } });

    for (let i = 0; i < 8; i++) {
      const ev: SystemEvent = { type: 'SESSION_EXPIRED', sessionId: `s${i}`, timestamp: new Date() };
      await store.save(createOutboxMessage(`m${i}`, ev.type, `s${i}`, ev as any, `c${i}`, new Date()));
    }

    // Batch size is 5
    const firstRun = await processor.processOnce();
    expect(firstRun).toBe(5);

    const secondRun = await processor.processOnce();
    expect(secondRun).toBe(3);

    expect(dispatched).toHaveLength(8);
    expect(await store.countByStatus('pending')).toBe(0);
    expect(await store.countByStatus('published')).toBe(8);
  });

  it('moves message to dead_letter after 5 retries via bus failure', async () => {
    // Use a bus that always throws on publish to trigger outbox retries
    const throwingBus = { publish: async () => { throw new Error('bus down'); } } as any;
    const failProcessor = new OutboxProcessor(store, throwingBus, noopLogger, 5);

    const ev: SystemEvent = { type: 'SESSION_EXPIRED', sessionId: 'dlq', timestamp: new Date() };
    const msg = createOutboxMessage('dlq-1', ev.type, 'dlq', ev as any, 'c', new Date());
    await store.save(msg);

    // 5 failed attempts → status transitions to dead_letter on the 5th
    for (let i = 0; i < 5; i++) {
      await failProcessor.processOnce();
    }

    expect(await store.countByStatus('dead_letter')).toBe(1);
  });

  it('countByStatus tracks all states correctly', async () => {
    const ev: SystemEvent = { type: 'SESSION_CREATED', sessionId: 's', expiresAt: new Date(), timestamp: new Date() };
    await store.save(createOutboxMessage('ok', ev.type, 's', ev as any, 'c', new Date()));

    const evFail: SystemEvent = { type: 'SESSION_EXPIRED', sessionId: 'f', timestamp: new Date() };
    const failMsg = createOutboxMessage('fail', evFail.type, 'f', evFail as any, 'cf', new Date());
    await store.save(failMsg);
    await store.markFailed('fail', 'err', new Date());

    expect(await store.countByStatus('pending')).toBe(1);
    expect(await store.countByStatus('failed')).toBe(1);
  });
});
