/**
 * Redis Rate Limit Store — production rate limiting using ioredis.
 * Implements the RateLimitStore interface from rate-limit.middleware.
 */

import Redis from 'ioredis';
import type { RateLimitStore } from '../../api/middlewares/rate-limit.middleware';

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly client: Redis) {}

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    if (!results) {
      return { count: 1, ttl: windowSeconds };
    }

    const count = (results[0][1] as number) ?? 1;
    let ttl = (results[1][1] as number) ?? -1;

    // Set expiry on first request
    if (count === 1 || ttl < 0) {
      await this.client.expire(key, windowSeconds);
      ttl = windowSeconds;
    }

    return { count, ttl };
  }
}
