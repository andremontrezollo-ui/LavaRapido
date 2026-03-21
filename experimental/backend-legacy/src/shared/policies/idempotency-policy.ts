/**
 * Idempotency Policy — prevents duplicate command/event processing.
 */

export interface IdempotencyRecord {
  readonly key: string;
  readonly result: string; // JSON serialized result
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  save(record: IdempotencyRecord): Promise<void>;
  exists(key: string): Promise<boolean>;
  deleteExpired(now: Date): Promise<number>;
}

export class IdempotencyGuard {
  constructor(
    private readonly store: IdempotencyStore,
    private readonly ttlSeconds: number = 3600,
  ) {}

  async executeOnce<T>(
    key: string,
    operation: () => Promise<T>,
    now: Date = new Date(),
  ): Promise<T> {
    const existing = await this.store.get(key);
    if (existing) {
      return JSON.parse(existing.result) as T;
    }

    const result = await operation();
    await this.store.save({
      key,
      result: JSON.stringify(result),
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ttlSeconds * 1000),
    });
    return result;
  }

  async isProcessed(key: string): Promise<boolean> {
    return this.store.exists(key);
  }
}
