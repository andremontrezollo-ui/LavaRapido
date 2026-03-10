/**
 * Rate Limiting Middleware — configurable max requests per window.
 * Use RedisRateLimitStore for distributed rate limiting; InMemoryRateLimitStore for testing only.
 * Default: 100 req/min per (ip, endpoint) pair.
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
    private readonly maxRequests: number = 100,
    private readonly windowSeconds: number = 60,
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
 * Redis-backed distributed Rate Limit Store.
 * Requires an ioredis-compatible client.
 */
export interface RedisClient {
  multi(): {
    incr(key: string): unknown;
    expire(key: string, seconds: number): unknown;
    exec(): Promise<Array<[Error | null, unknown]>>;
  };
  ttl(key: string): Promise<number>;
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: RedisClient) {}

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const pipeline = this.redis.multi();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();

    const count = (results?.[0]?.[1] as number) ?? 1;
    const ttl = await this.redis.ttl(key);
    return { count, ttl: ttl > 0 ? ttl : windowSeconds };
  }
}

/**
 * In-Memory Rate Limit Store — for testing and development only.
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
