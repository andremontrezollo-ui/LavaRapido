/**
 * Redis Distributed Lock — production-grade locking with SET NX PX and Lua-based release.
 * Unique lock tokens prevent accidental release by non-owner.
 * Lua script ensures atomic check-and-delete, preventing race conditions.
 */

import type { Redis } from 'ioredis';
import type { DistributedLock } from '../../shared/ports/DistributedLock';
import { randomBytes } from 'crypto';

const RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const RENEW_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`;

export class RedisDistributedLock implements DistributedLock {
  private tokens = new Map<string, string>();

  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const token = randomBytes(16).toString('hex');
    const result = await this.redis.set(
      key,
      token,
      'PX',
      ttlSeconds * 1000,
      'NX',
    );
    if (result === 'OK') {
      this.tokens.set(key, token);
      return true;
    }
    return false;
  }

  async release(key: string): Promise<void> {
    const token = this.tokens.get(key);
    if (!token) return;
    await this.redis.eval(RELEASE_LUA, 1, key, token);
    this.tokens.delete(key);
  }

  async renew(key: string, ttlSeconds: number): Promise<boolean> {
    const token = this.tokens.get(key);
    if (!token) return false;
    const result = await this.redis.eval(RENEW_LUA, 1, key, token, String(ttlSeconds * 1000));
    return result === 1;
  }

  async isHeld(key: string): Promise<boolean> {
    const token = this.tokens.get(key);
    if (!token) return false;
    const stored = await this.redis.get(key);
    return stored === token;
  }
}
