/**
 * In-Memory Idempotency Store.
 */

import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | null> {
    const record = this.records.get(key);
    if (!record) return null;
    if (record.expiresAt < new Date()) {
      this.records.delete(key);
      return null;
    }
    return record;
  }

  async save(record: IdempotencyRecord): Promise<void> {
    this.records.set(record.key, record);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async deleteExpired(now: Date): Promise<number> {
    let count = 0;
    for (const [key, record] of this.records) {
      if (record.expiresAt < now) { this.records.delete(key); count++; }
    }
    return count;
  }

  clear(): void { this.records.clear(); }
}
