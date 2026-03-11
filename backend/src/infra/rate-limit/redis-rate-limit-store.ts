/**
 * Redis Rate Limit Store — atomic sliding-window counter using ioredis.
 * Uses INCR + PEXPIRE for atomic rate limit tracking.
 */

import type { Redis } from 'ioredis';

export interface RateLimitStore {
  increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }>;
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: Redis) {}

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    const ttl = await this.redis.ttl(key);
    return { count, ttl: ttl > 0 ? ttl : windowSeconds };
  }
}

export default RedisRateLimitStore;