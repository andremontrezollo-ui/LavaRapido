/**
 * RedisDistributedLock — production-grade distributed lock using Redis SET NX PX.
 * Guarantees mutual exclusion across multiple processes/instances.
 */

import type Redis from 'ioredis';
import type { DistributedLock } from '../../shared/ports/DistributedLock';

export class RedisDistributedLock implements DistributedLock {
  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${key}`,
      '1',
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }

  async renew(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.expire(`lock:${key}`, ttlSeconds);
    return result === 1;
  }

  async isHeld(key: string): Promise<boolean> {
    const result = await this.redis.exists(`lock:${key}`);
    return result === 1;
  }
}
