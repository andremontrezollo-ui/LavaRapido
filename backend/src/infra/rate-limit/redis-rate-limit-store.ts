/**
 * Redis Rate Limit Store — ioredis-backed implementation.
 * Implements the RateLimitStore interface from the API middleware layer.
 */

import type { RateLimitStore } from '../../api/middlewares/rate-limit.middleware';

interface RedisLikeClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly client: RedisLikeClient) {}

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    const ttl = await this.client.ttl(key);
    return { count, ttl: ttl > 0 ? ttl : windowSeconds };
  }
}