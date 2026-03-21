/**
 * In-Memory Outbox Store — production would use Supabase table.
 */

import type { OutboxMessage, OutboxStore, OutboxStatus } from '../../shared/events/outbox-message';

export class InMemoryOutboxStore implements OutboxStore {
  private messages = new Map<string, OutboxMessage>();

  async save(message: OutboxMessage): Promise<void> {
    this.messages.set(message.id, { ...message });
  }

  async findPending(limit: number): Promise<OutboxMessage[]> {
    return Array.from(this.messages.values())
      .filter(m => m.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  async markPublished(id: string, now: Date): Promise<void> {
    const msg = this.messages.get(id);
    if (msg) { msg.status = 'published'; msg.publishedAt = now; }
  }

  async markFailed(id: string, error: string, now: Date): Promise<void> {
    const msg = this.messages.get(id);
    if (msg) {
      msg.retryCount++;
      msg.lastAttemptAt = now;
      msg.error = error;
      if (msg.retryCount >= 5) msg.status = 'dead_letter';
      else msg.status = 'failed';
    }
  }

  async markDeadLetter(id: string, now: Date): Promise<void> {
    const msg = this.messages.get(id);
    if (msg) { msg.status = 'dead_letter'; msg.lastAttemptAt = now; }
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    return Array.from(this.messages.values()).filter(m => m.status === status).length;
  }

  clear(): void { this.messages.clear(); }
}
