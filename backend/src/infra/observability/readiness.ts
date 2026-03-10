import type { Pool } from 'pg';
import type Redis from 'ioredis';

export interface ReadinessReport {
  ready: boolean;
  checks: { name: string; ready: boolean; details?: string }[];
  timestamp: string;
}

export class ReadinessCheck {
  constructor(
    private readonly pool?: Pool,
    private readonly redis?: Redis,
  ) {}

  async checkAll(): Promise<ReadinessReport> {
    const checks: { name: string; ready: boolean; details?: string }[] = [];

    if (this.pool) {
      try {
        await this.pool.query('SELECT 1');
        checks.push({ name: 'database', ready: true });
      } catch (err) {
        checks.push({ name: 'database', ready: false, details: String(err) });
      }
    }

    if (this.redis) {
      try {
        const result = await this.redis.ping();
        checks.push({ name: 'redis', ready: result === 'PONG' });
      } catch (err) {
        checks.push({ name: 'redis', ready: false, details: String(err) });
      }
    }

    const ready = checks.length === 0 || checks.every(c => c.ready);
    return {
      ready,
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
