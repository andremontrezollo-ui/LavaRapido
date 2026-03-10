/**
 * Production health checks — validates all critical dependencies.
 * GET /health   — liveness (always 200 if process is running)
 * GET /readiness — readiness (fails if any dependency is unavailable)
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { OutboxStore } from '../../shared/events/outbox-message';
import type { JobStore } from '../scheduler/job-scheduler';

export interface CheckResult {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  details?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  uptime: number;
  timestamp: string;
}

export class ProductionHealthChecker {
  private readonly startTime = Date.now();

  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly outbox: OutboxStore,
    private readonly jobStore: JobStore,
  ) {}

  liveness(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async readiness(): Promise<HealthStatus> {
    const checks: Record<string, CheckResult> = {};

    await Promise.all([
      this.checkPostgres().then(r => { checks.postgres = r; }),
      this.checkRedis().then(r => { checks.redis = r; }),
      this.checkOutboxBacklog().then(r => { checks.outbox = r; }),
      this.checkScheduler().then(r => { checks.scheduler = r; }),
    ]);

    const hasError = Object.values(checks).some(c => c.status === 'error');
    const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');

    return {
      status: hasError ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkPostgres(): Promise<CheckResult> {
    const t0 = Date.now();
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
      return { status: 'ok', latencyMs: Date.now() - t0 };
    } catch (err) {
      return {
        status: 'error',
        latencyMs: Date.now() - t0,
        details: err instanceof Error ? err.message : 'PostgreSQL unreachable',
      };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const t0 = Date.now();
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') throw new Error(`Unexpected ping response: ${pong}`);
      return { status: 'ok', latencyMs: Date.now() - t0 };
    } catch (err) {
      return {
        status: 'error',
        latencyMs: Date.now() - t0,
        details: err instanceof Error ? err.message : 'Redis unreachable',
      };
    }
  }

  private async checkOutboxBacklog(): Promise<CheckResult> {
    try {
      const pendingCount = await this.outbox.countByStatus('pending');
      const dlqCount = await this.outbox.countByStatus('dead_letter');

      if (dlqCount > 10) {
        return { status: 'degraded', details: `pending=${pendingCount}, dlq=${dlqCount}` };
      }
      return { status: 'ok', details: `pending=${pendingCount}, dlq=${dlqCount}` };
    } catch (err) {
      return {
        status: 'error',
        details: err instanceof Error ? err.message : 'Cannot read outbox',
      };
    }
  }

  private async checkScheduler(): Promise<CheckResult> {
    try {
      const dueJobs = await this.jobStore.findDue(new Date(), 100);
      if (dueJobs.length > 50) {
        return { status: 'degraded', details: `due_jobs=${dueJobs.length} (backlog)` };
      }
      return { status: 'ok', details: `due_jobs=${dueJobs.length}` };
    } catch (err) {
      return {
        status: 'error',
        details: err instanceof Error ? err.message : 'Cannot read job store',
      };
    }
  }
}
