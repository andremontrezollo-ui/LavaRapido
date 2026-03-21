/**
 * Rate Limiting Middleware.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }>;
}

export class RateLimitMiddleware {
  constructor(
    private readonly store: RateLimitStore,
    private readonly maxRequests: number = 10,
    private readonly windowSeconds: number = 600,
  ) {}

  async check(ipHash: string, endpoint: string): Promise<RateLimitResult> {
    const key = `rate:${endpoint}:${ipHash}`;
    const { count, ttl } = await this.store.increment(key, this.windowSeconds);

    if (count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: ttl,
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - count,
    };
  }
}

/**
 * In-Memory Rate Limit Store.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || entry.expiresAt < now) {
      const expiresAt = now + windowSeconds * 1000;
      this.entries.set(key, { count: 1, expiresAt });
      return { count: 1, ttl: windowSeconds };
    }

    entry.count++;
    return { count: entry.count, ttl: Math.ceil((entry.expiresAt - now) / 1000) };
  }

  clear(): void { this.entries.clear(); }
}
