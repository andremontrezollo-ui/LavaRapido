/**
 * Outbox Processor — reads pending outbox messages and publishes them via EventBus.
 */

import type { OutboxStore } from '../../shared/events/outbox-message';
import type { EventBus, SystemEvent } from '../../shared/events';
import type { Logger } from '../../shared/logging';

export class OutboxProcessor {
  private running = false;

  constructor(
    private readonly outbox: OutboxStore,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly batchSize: number = 10,
  ) {}

  async processOnce(): Promise<number> {
    const pending = await this.outbox.findPending(this.batchSize);
    let published = 0;

    for (const msg of pending) {
      try {
        const event = JSON.parse(msg.payload) as SystemEvent;
        // Restore Date objects
        if (typeof event.timestamp === 'string') {
          (event as any).timestamp = new Date(event.timestamp);
        }
        await this.eventBus.publish(event);
        await this.outbox.markPublished(msg.id, new Date());
        published++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.error('Outbox publish failed', { messageId: msg.id, eventType: msg.eventType, error });
        await this.outbox.markFailed(msg.id, error, new Date());
      }
    }

    return published;
  }

  async start(intervalMs: number): Promise<void> {
    this.running = true;
    while (this.running) {
      try {
        await this.processOnce();
      } catch (err) {
        this.logger.error('Outbox processor error', { error: String(err) });
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  stop(): void { this.running = false; }
}
