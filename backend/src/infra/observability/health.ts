import type { Pool } from 'pg';
import type Redis from 'ioredis';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy';
  details?: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  timestamp: string;
  uptime: number;
}

export class HealthCheck {
  private readonly startTime = Date.now();

  constructor(
    private readonly pool?: Pool,
    private readonly redis?: Redis,
  ) {}

  async checkPostgres(): Promise<HealthCheckResult> {
    if (!this.pool) return { name: 'postgres', status: 'healthy', details: 'not configured' };
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return { name: 'postgres', status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      return { name: 'postgres', status: 'unhealthy', details: String(err) };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    if (!this.redis) return { name: 'redis', status: 'healthy', details: 'not configured' };
    const start = Date.now();
    try {
      const result = await this.redis.ping();
      if (result !== 'PONG') throw new Error('Unexpected PING response');
      return { name: 'redis', status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      return { name: 'redis', status: 'unhealthy', details: String(err) };
    }
  }

  async checkAll(): Promise<HealthReport> {
    const [pg, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);
    const checks = [pg, redis];
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    return {
      status: hasUnhealthy ? 'unhealthy' : 'healthy',
      checks,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
