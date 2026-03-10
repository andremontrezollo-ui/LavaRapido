import Redis from 'ioredis';
import type { RateLimitStore } from '../../api/middlewares/rate-limit.middleware';

const LUA_SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {c, redis.call('TTL', KEYS[1])}
`;

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly client: Redis) {}

  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const result = await this.client.eval(
      LUA_SCRIPT,
      1,
      key,
      String(windowSeconds),
    ) as [number, number];
    return { count: result[0], ttl: result[1] };
  }
}