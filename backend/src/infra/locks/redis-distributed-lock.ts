/**
 * Redis Distributed Lock
 * Production implementation using Redis SET NX PX (Redlock-compatible).
 */

import type { Redis } from 'ioredis';
import type { DistributedLock } from '../../shared/ports/DistributedLock';

export class RedisDistributedLock implements DistributedLock {
  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${key}`,
      'locked',
      'EX', ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }

  async renew(key: string, ttlSeconds: number): Promise<boolean> {
    const exists = await this.redis.exists(`lock:${key}`);
    if (!exists) return false;
    await this.redis.expire(`lock:${key}`, ttlSeconds);
    return true;
  }

  async isHeld(key: string): Promise<boolean> {
    return (await this.redis.exists(`lock:${key}`)) === 1;
  }
}
