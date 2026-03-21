/**
 * In-Memory Inbox Store — deduplication for incoming events.
 */

import type { InboxMessage, InboxStore } from '../../shared/events/inbox-message';

export class InMemoryInboxStore implements InboxStore {
  private messages = new Map<string, InboxMessage[]>();

  async exists(eventId: string, handlerName: string): Promise<boolean> {
    const entries = this.messages.get(eventId);
    return entries?.some(m => m.handlerName === handlerName) ?? false;
  }

  async save(message: InboxMessage): Promise<void> {
    const existing = this.messages.get(message.eventId) ?? [];
    existing.push(message);
    this.messages.set(message.eventId, existing);
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    return this.messages.get(eventId) ?? [];
  }

  async countProcessed(since: Date): Promise<number> {
    let count = 0;
    for (const entries of this.messages.values()) {
      count += entries.filter(m => m.processedAt >= since).length;
    }
    return count;
  }

  clear(): void { this.messages.clear(); }
}
