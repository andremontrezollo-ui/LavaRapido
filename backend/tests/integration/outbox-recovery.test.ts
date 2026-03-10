/**
 * Outbox Recovery Tests
 * Verifies that pending outbox messages survive simulated process restart
 * and are re-published by the OutboxProcessor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOutboxStore } from '../../src/test-utils/in-memory-outbox-store';
import { ResilientEventBus } from '../../src/test-utils/in-memory-event-bus';
import { OutboxProcessor } from '../../src/infra/messaging/outbox-processor';
import { createOutboxMessage } from '../../src/shared/events/outbox-message';
import type { SystemEvent } from '../../src/shared/events/DomainEvent';
import type { Logger } from '../../src/shared/logging';

const nopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => nopLogger,
};

const makeMsg = (id: string) =>
  createOutboxMessage(
    id,
    'DEPOSIT_DETECTED',
    'agg-1',
    {
      type: 'DEPOSIT_DETECTED',
      txId: id,
      address: 'bc1q',
      amount: 0.1,
      blockHeight: 1,
      timestamp: new Date().toISOString(),
    },
    'corr-1',
    new Date(),
  );

describe('Outbox recovery', () => {
  let outbox: InMemoryOutboxStore;
  let bus: ResilientEventBus;
  let processor: OutboxProcessor;
  const published: string[] = [];

  beforeEach(() => {
    published.length = 0;
    outbox = new InMemoryOutboxStore();
    bus = new ResilientEventBus(null, { maxRetries: 0, retryDelayMs: 1 });
    bus.subscribeAll({
      handlerName: 'capture-handler',
      handle: async (e: SystemEvent) => { published.push((e as any).txId ?? e.type); },
    });
    processor = new OutboxProcessor(outbox, bus, nopLogger, 10);
  });

  it('publishes all pending outbox messages', async () => {
    await outbox.save(makeMsg('tx-a'));
    await outbox.save(makeMsg('tx-b'));

    const count = await processor.processOnce();

    expect(count).toBe(2);
    expect(published).toContain('tx-a');
    expect(published).toContain('tx-b');
  });

  it('marks messages published after successful delivery', async () => {
    await outbox.save(makeMsg('tx-c'));

    await processor.processOnce();

    const remaining = await outbox.findPending(10);
    expect(remaining).toHaveLength(0);
    expect(await outbox.countByStatus('published')).toBe(1);
  });

  it('increments retry counter and marks failed on delivery error', async () => {
    const msg = makeMsg('tx-err');
    await outbox.save({ ...msg, payload: 'invalid json {{' });

    await processor.processOnce();

    expect(await outbox.countByStatus('failed')).toBe(1);
    expect(await outbox.countByStatus('published')).toBe(0);
  });

  it('simulates restart: pending messages are re-processed by new processor instance', async () => {
    await outbox.save(makeMsg('restart-tx'));

    // First processor crashes before processing
    const proc2 = new OutboxProcessor(outbox, bus, nopLogger, 10);
    const count = await proc2.processOnce();

    expect(count).toBe(1);
    expect(published).toContain('restart-tx');
  });

  it('moves message to dead_letter after 5 failures', async () => {
    const msg = makeMsg('dlq-tx');
    await outbox.save(msg);

    // Simulate 5 failures
    for (let i = 0; i < 5; i++) {
      await outbox.markFailed(msg.id, 'forced error', new Date());
    }

    expect(await outbox.countByStatus('dead_letter')).toBe(1);
  });

  it('does not duplicate publish when processOnce is called twice on same messages', async () => {
    await outbox.save(makeMsg('dedup-tx'));

    await processor.processOnce();
    await processor.processOnce(); // second call should find no pending

    expect(published).toHaveLength(1);
  });
});
