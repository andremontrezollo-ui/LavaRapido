import type Redis from 'ioredis';

export class RedisRateLimitStore {
    constructor(private readonly client: Redis) {}

    async increment(key: string, limit: number, period: number): Promise<number> {
        const currentCount = await this.client.incr(key);

        if (currentCount === 1) {
            await this.client.expire(key, period);
        }

        return currentCount;
    }

    async isLimitExceeded(key: string, limit: number): Promise<boolean> {
        const value = await this.client.get(key);
        const currentCount = value ? parseInt(value, 10) : 0;
        return currentCount >= limit;
    }
}

export default RedisRateLimitStore;
