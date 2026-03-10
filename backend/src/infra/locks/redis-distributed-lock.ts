import Redis from 'ioredis';
import type { DistributedLock } from '../../shared/ports/DistributedLock';

const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

const RENEW_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
else
  return 0
end
`;

export class RedisDistributedLock implements DistributedLock {
  private readonly tokens = new Map<string, string>();

  constructor(private readonly client: Redis) {}

  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const token = crypto.randomUUID();
    const result = await this.client.set(key, token, 'PX', ttlSeconds * 1000, 'NX');
    if (result === 'OK') {
      this.tokens.set(key, token);
      return true;
    }
    return false;
  }

  async release(key: string): Promise<void> {
    const token = this.tokens.get(key);
    if (!token) return;
    await this.client.eval(RELEASE_SCRIPT, 1, key, token);
    this.tokens.delete(key);
  }

  async renew(key: string, ttlSeconds: number): Promise<boolean> {
    const token = this.tokens.get(key);
    if (!token) return false;
    const result = await this.client.eval(
      RENEW_SCRIPT,
      1,
      key,
      token,
      String(ttlSeconds * 1000),
    ) as number;
    return result === 1;
  }

  async isHeld(key: string): Promise<boolean> {
    const token = this.tokens.get(key);
    if (!token) return false;
    const value = await this.client.get(key);
    return value === token;
  }
}
