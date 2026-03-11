/**
 * Health & Readiness Infrastructure — comprehensive dependency checks.
 * Checks PostgreSQL, Redis, outbox backlog, DLQ, scheduler, and saga processor.
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { OutboxStore } from '../../shared/events/outbox-message';
import type { JobStore } from '../scheduler/job-scheduler';
import type { SagaStore } from '../saga/saga-orchestrator';

export interface ComponentCheck {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  details?: string;
}

export interface ReadinessReport {
  isReady: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, ComponentCheck>;
  uptime: number;
  timestamp: string;
}

export class InfrastructureHealthChecker {
  private readonly startTime = Date.now();

  constructor(
    private readonly pgPool: Pool,
    private readonly redis: Redis,
    private readonly outbox: OutboxStore,
    private readonly jobStore: JobStore,
    private readonly sagaStore: SagaStore,
  ) {}

  async check(): Promise<ReadinessReport> {
    const checks: Record<string, ComponentCheck> = {};

    await Promise.all([
      this.checkPostgres(checks),
      this.checkRedis(checks),
      this.checkOutbox(checks),
      this.checkScheduler(checks),
      this.checkSagas(checks),
    ]);

    const hasError = Object.values(checks).some(c => c.status === 'error');
    const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');

    const status: ReadinessReport['status'] = hasError
      ? 'unhealthy'
      : hasDegraded
      ? 'degraded'
      : 'healthy';

    return {
      isReady: !hasError,
      status,
      checks,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkPostgres(checks: Record<string, ComponentCheck>): Promise<void> {
    const start = Date.now();
    try {
      const client = await this.pgPool.connect();
      try {
        await client.query('SELECT 1');
        checks.postgres = { status: 'ok', latencyMs: Date.now() - start };
      } finally {
        client.release();
      }
    } catch (err) {
      checks.postgres = {
        status: 'error',
        latencyMs: Date.now() - start,
        details: `PostgreSQL unreachable: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async checkRedis(checks: Record<string, ComponentCheck>): Promise<void> {
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      checks.redis = {
        status: pong === 'PONG' ? 'ok' : 'degraded',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      checks.redis = {
        status: 'error',
        latencyMs: Date.now() - start,
        details: `Redis unreachable: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async checkOutbox(checks: Record<string, ComponentCheck>): Promise<void> {
    try {
      const [pending, dlq] = await Promise.all([
        this.outbox.countByStatus('pending'),
        this.outbox.countByStatus('dead_letter'),
      ]);
      checks.outbox = {
        status: dlq > 10 ? 'degraded' : 'ok',
        details: `pending=${pending}, dlq=${dlq}`,
      };
    } catch (err) {
      checks.outbox = {
        status: 'error',
        details: `Outbox check failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async checkScheduler(checks: Record<string, ComponentCheck>): Promise<void> {
    try {
      const due = await this.jobStore.findDue(new Date(), 100);
      checks.scheduler = {
        status: due.length > 50 ? 'degraded' : 'ok',
        details: `overdue_jobs=${due.length}`,
      };
    } catch (err) {
      checks.scheduler = {
        status: 'error',
        details: `Scheduler check failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async checkSagas(checks: Record<string, ComponentCheck>): Promise<void> {
    try {
      const active = await this.sagaStore.findActive();
      checks.sagas = {
        status: active.length > 100 ? 'degraded' : 'ok',
        details: `active_sagas=${active.length}`,
      };
    } catch (err) {
      checks.sagas = {
        status: 'error',
        details: `Saga check failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
