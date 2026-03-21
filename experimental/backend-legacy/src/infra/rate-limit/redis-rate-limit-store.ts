import { RedisClient } from 'redis';

class RedisRateLimitStore {
    private client: RedisClient;

    constructor(redisClient: RedisClient) {
        this.client = redisClient;
    }

    // Increment the rate limit for a specific key
    async increment(key: string, limit: number, period: number): Promise<number> {
        const currentCount = await new Promise<number>((resolve, reject) => {
            this.client.incr(key, (err, reply) => {
                if (err) reject(err);
                else resolve(reply);
            });
        });

        // Set expiration time if it's the first request
        if (currentCount === 1) {
            await new Promise<void>((resolve, reject) => {
                this.client.expire(key, period, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        return currentCount;
    }

    // Check if the limit has been exceeded
    async isLimitExceeded(key: string, limit: number): Promise<boolean> {
        const currentCount = await new Promise<number>((resolve, reject) => {
            this.client.get(key, (err, reply) => {
                if (err) reject(err);
                else resolve(reply ? parseInt(reply) : 0);
            });
        });
        return currentCount >= limit;
    }
}

export default RedisRateLimitStore;