/**
 * Integration test — PostgresEventBus durable delivery
 *
 * Uses in-memory test doubles (no real DB) to verify the bus
 * persists, dispatches, and marks events as published/failed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('EventBus — durable delivery', () => {
  let outboxStore: InMemoryOutboxStore;
  let eventBus: ResilientEventBus;
  let processor: OutboxProcessor;

  beforeEach(() => {
    outboxStore = new InMemoryOutboxStore();
    eventBus = new ResilientEventBus(null, { maxRetries: 1, retryDelayMs: 0 });
    processor = new OutboxProcessor(outboxStore, eventBus, noopLogger, 10);
  });

  it('processes a pending outbox message and marks it published', async () => {
    const event: SystemEvent = {
      type: 'SESSION_CREATED',
      sessionId: 'sess-1',
      expiresAt: new Date('2030-01-01'),
      timestamp: new Date(),
    };
    const msg = createOutboxMessage('msg-1', event.type, 'sess-1', event as any, 'corr-1', new Date());
    await outboxStore.save(msg);

    const published: SystemEvent[] = [];
    eventBus.subscribeAll({ handlerName: 'test-handler', handle: async (e) => { published.push(e); } });

    const count = await processor.processOnce();

    expect(count).toBe(1);
    expect(published).toHaveLength(1);
    expect(published[0].type).toBe('SESSION_CREATED');
    expect(await outboxStore.countByStatus('published')).toBe(1);
    expect(await outboxStore.countByStatus('pending')).toBe(0);
  });

  it('marks message as failed when the eventBus publish throws', async () => {
    const event: SystemEvent = {
      type: 'SESSION_EXPIRED',
      sessionId: 'sess-bad',
      timestamp: new Date(),
    };
    const msg = createOutboxMessage('msg-fail', event.type, 'sess-bad', event as any, 'corr-2', new Date());
    await outboxStore.save(msg);

    // Substitute a bus that throws on publish to simulate infra failure
    const throwingBus = { publish: async () => { throw new Error('bus unavailable'); } } as any;
    const failProcessor = new OutboxProcessor(outboxStore, throwingBus, noopLogger, 10);
    const count = await failProcessor.processOnce();

    expect(count).toBe(0);
    const failed = await outboxStore.countByStatus('failed');
    const dlq = await outboxStore.countByStatus('dead_letter');
    expect(failed + dlq).toBe(1);
  });

  it('does not reprocess already published messages', async () => {
    const event: SystemEvent = {
      type: 'SESSION_CREATED',
      sessionId: 'sess-done',
      expiresAt: new Date('2030-01-01'),
      timestamp: new Date(),
    };
    const msg = createOutboxMessage('msg-done', event.type, 'sess-done', event as any, 'corr-3', new Date());
    await outboxStore.save(msg);
    await outboxStore.markPublished('msg-done', new Date());

    const published: SystemEvent[] = [];
    eventBus.subscribeAll({ handlerName: 'h', handle: async (e) => { published.push(e); } });

    const count = await processor.processOnce();

    expect(count).toBe(0);
    expect(published).toHaveLength(0);
  });
});
