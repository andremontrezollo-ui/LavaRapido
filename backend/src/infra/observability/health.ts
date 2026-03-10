/**
 * Health Check Service
 * Provides liveness (/health) and readiness (/readiness) checks.
 *
 * Checks performed:
 *  - PostgreSQL connectivity
 *  - Redis connectivity
 *  - OutboxProcessor backlog
 *  - JobScheduler queue depth
 *  - SagaOrchestrator active sagas
 *  - EventBus backlog (PostgresEventBus)
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { OutboxStore } from '../../shared/events/outbox-message';
import type { JobStore } from '../scheduler/job-scheduler';
import type { SagaStore } from '../saga/saga-orchestrator';
import type { PostgresEventBus } from '../messaging/postgres-event-bus';

export type CheckStatus = 'ok' | 'degraded' | 'error';

export interface CheckResult {
  status: CheckStatus;
  details?: string;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  uptime: number;
  timestamp: string;
}

export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly pgPool: Pool | null = null,
    private readonly redis: Redis | null = null,
    private readonly outbox: OutboxStore | null = null,
    private readonly jobStore: JobStore | null = null,
    private readonly sagaStore: SagaStore | null = null,
    private readonly eventBus: PostgresEventBus | null = null,
  ) {}

  /** Liveness: just confirms the process is up. */
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  /** Readiness: confirms all dependencies are healthy. */
  async readiness(): Promise<HealthReport> {
    const checks: Record<string, CheckResult> = {};

    await Promise.all([
      this.checkPostgres(checks),
      this.checkRedis(checks),
      this.checkOutbox(checks),
      this.checkJobScheduler(checks),
      this.checkSagaOrchestrator(checks),
      this.checkEventBusBacklog(checks),
    ]);

    const hasErrors = Object.values(checks).some(c => c.status === 'error');
    const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');

    return {
      status: hasErrors ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkPostgres(checks: Record<string, CheckResult>): Promise<void> {
    if (!this.pgPool) { checks.postgres = { status: 'ok', details: 'not configured' }; return; }
    try {
      await this.pgPool.query('SELECT 1');
      checks.postgres = { status: 'ok' };
    } catch (err) {
      checks.postgres = { status: 'error', details: `Cannot connect: ${err}` };
    }
  }

  private async checkRedis(checks: Record<string, CheckResult>): Promise<void> {
    if (!this.redis) { checks.redis = { status: 'ok', details: 'not configured' }; return; }
    try {
      await this.redis.ping();
      checks.redis = { status: 'ok' };
    } catch (err) {
      checks.redis = { status: 'error', details: `Cannot connect: ${err}` };
    }
  }

  private async checkOutbox(checks: Record<string, CheckResult>): Promise<void> {
    if (!this.outbox) { checks.outbox = { status: 'ok', details: 'not configured' }; return; }
    try {
      const pending = await this.outbox.countByStatus('pending');
      const dlq = await this.outbox.countByStatus('dead_letter');
      checks.outbox = {
        status: dlq > 10 ? 'degraded' : 'ok',
        details: `pending=${pending}, dlq=${dlq}`,
      };
    } catch (err) {
      checks.outbox = { status: 'error', details: `Cannot read outbox: ${err}` };
    }
  }

  private async checkJobScheduler(checks: Record<string, CheckResult>): Promise<void> {
    if (!this.jobStore) { checks.job_scheduler = { status: 'ok', details: 'not configured' }; return; }
    try {
      const due = await this.jobStore.findDue(new Date(), 100);
      checks.job_scheduler = {
        status: due.length > 50 ? 'degraded' : 'ok',
        details: `due_jobs=${due.length}`,
      };
    } catch (err) {
      checks.job_scheduler = { status: 'error', details: `Cannot read job store: ${err}` };
    }
  }

  private async checkSagaOrchestrator(checks: Record<string, CheckResult>): Promise<void> {
    if (!this.sagaStore) { checks.saga_orchestrator = { status: 'ok', details: 'not configured' }; return; }
    try {
      const active = await this.sagaStore.findActive();
      checks.saga_orchestrator = {
        status: active.length > 100 ? 'degraded' : 'ok',
        details: `active_sagas=${active.length}`,
      };
    } catch (err) {
      checks.saga_orchestrator = { status: 'error', details: `Cannot read saga store: ${err}` };
    }
  }

  private async checkEventBusBacklog(checks: Record<string, CheckResult>): Promise<void> {
    if (!this.eventBus) { checks.event_bus = { status: 'ok', details: 'not configured' }; return; }
    try {
      const backlog = await this.eventBus.getBacklog();
      const pendingCount = (backlog['pending'] ?? 0) + (backlog['failed'] ?? 0);
      const dlqCount = backlog['dead_letter'] ?? 0;
      checks.event_bus = {
        status: dlqCount > 10 || pendingCount > 200 ? 'degraded' : 'ok',
        details: `pending=${pendingCount}, dlq=${dlqCount}`,
      };
    } catch (err) {
      checks.event_bus = { status: 'error', details: `Cannot read event bus backlog: ${err}` };
    }
  }
}
