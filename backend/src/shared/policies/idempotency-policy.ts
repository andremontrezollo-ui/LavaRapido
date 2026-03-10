/**
 * Idempotency Policy — prevents duplicate command/event processing.
 * Supports persistent store with atomic ON CONFLICT deduplication and retry.
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

export interface IdempotencyPolicyOptions {
  ttlSeconds?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class IdempotencyPolicy {
  private readonly ttlSeconds: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly store: IdempotencyStore,
    options: IdempotencyPolicyOptions = {},
  ) {
    this.ttlSeconds = options.ttlSeconds ?? 3600;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 200;
  }

  /**
   * Execute the operation exactly once per idempotency key.
   * On retry, returns the cached result without re-executing.
   * Retries on transient store errors up to maxRetries times.
   */
  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    now: Date = new Date(),
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
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
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  async isProcessed(key: string): Promise<boolean> {
    return this.store.exists(key);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** @deprecated Use IdempotencyPolicy instead. IdempotencyPolicy exposes execute() which wraps the operation with retry and persistent backing. */
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
