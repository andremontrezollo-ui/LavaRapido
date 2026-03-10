/**
 * Redis Distributed Lock — durable replacement for InMemoryDistributedLock.
 * Uses SET NX PX for atomic lock acquisition with TTL.
 */

import Redis from 'ioredis';
import type { DistributedLock } from '../../shared/ports/DistributedLock';

const LOCK_PREFIX = 'lock:';

export class RedisDistributedLock implements DistributedLock {
  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      LOCK_PREFIX + key,
      '1',
      'NX',
      'EX',
      ttlSeconds,
    );
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.redis.del(LOCK_PREFIX + key);
  }

  async renew(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.expire(LOCK_PREFIX + key, ttlSeconds);
    return result === 1;
  }

  async isHeld(key: string): Promise<boolean> {
    const exists = await this.redis.exists(LOCK_PREFIX + key);
    return exists === 1;
  }
}
