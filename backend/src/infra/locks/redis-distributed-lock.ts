/**
 * Redis-based Distributed Lock.
 * Uses SET NX PX pattern with safe Lua-script release to prevent deadlocks.
 * Supports lock renewal for long-running operations.
 */

import { randomBytes } from 'crypto';
import type { Redis } from 'ioredis';
import type { DistributedLock } from '../../shared/ports/DistributedLock';

// Lua script: release only if the value matches our token (prevents releasing another holder's lock)
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

// Lua script: renew only if we still hold the lock
const RENEW_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`;

export class RedisDistributedLock implements DistributedLock {
  // token map: lock key -> unique token (so we can safely release our own locks only)
  private tokens = new Map<string, string>();

  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const token = this.generateToken();
    const result = await this.redis.set(
      key,
      token,
      'NX',
      'PX',
      ttlSeconds * 1000,
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

    await this.redis.eval(RELEASE_SCRIPT, 1, key, token);
    this.tokens.delete(key);
  }

  async renew(key: string, ttlSeconds: number): Promise<boolean> {
    const token = this.tokens.get(key);
    if (!token) return false;

    const result = await this.redis.eval(
      RENEW_SCRIPT,
      1,
      key,
      token,
      String(ttlSeconds * 1000),
    );
    return result === 1;
  }

  async isHeld(key: string): Promise<boolean> {
    const token = this.tokens.get(key);
    if (!token) return false;

    const value = await this.redis.get(key);
    return value === token;
  }

  private generateToken(): string {
    return randomBytes(16).toString('hex');
  }
}
