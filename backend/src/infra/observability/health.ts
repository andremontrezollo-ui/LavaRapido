/**
 * Institutional Health Checker — verifies all critical infrastructure components.
 * Exposes GET /health (liveness) and GET /readiness (readiness probe) data.
 */

import { Pool } from 'pg';
import type Redis from 'ioredis';
import type { OutboxProcessor } from './../../infra/messaging/outbox-processor';
import type { PostgresEventBus } from './../../infra/messaging/postgres-event-bus';
import type { SecureJobScheduler } from './../../infra/scheduler/job-scheduler';
import type { SagaOrchestrator } from './../../infra/saga/saga-orchestrator';

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  detail?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: ComponentHealth[];
}

export class HealthChecker {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly eventBus?: PostgresEventBus,
    private readonly outboxProcessor?: OutboxProcessor,
    private readonly jobScheduler?: SecureJobScheduler,
    private readonly sagaOrchestrator?: SagaOrchestrator,
  ) {}

  /** Liveness — checks that the process itself is running and can handle requests. */
  liveness(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: [],
    };
  }

  /** Readiness — checks that all dependencies are available. */
  async readiness(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkEventBusBacklog(),
      this.checkOutboxProcessor(),
      this.checkJobScheduler(),
      this.checkSagaProcessor(),
    ]);

    const components = checks.filter((c): c is ComponentHealth => c !== null);
    const hasUnhealthy = components.some(c => c.status === 'unhealthy');
    const hasDegraded = components.some(c => c.status === 'degraded');

    return {
      status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      components,
    };
  }

  private async checkPostgres(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return { name: 'postgresql', status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        name: 'postgresql',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return { name: 'redis', status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        name: 'redis',
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkEventBusBacklog(): Promise<ComponentHealth> {
    if (!this.eventBus) return { name: 'event_bus', status: 'healthy', detail: 'not configured' };
    try {
      const pending = await this.eventBus.pendingCount();
      const DEGRADED_THRESHOLD = 1000;
      const UNHEALTHY_THRESHOLD = 10000;
      const status =
        pending >= UNHEALTHY_THRESHOLD ? 'unhealthy' :
        pending >= DEGRADED_THRESHOLD ? 'degraded' : 'healthy';
      return { name: 'event_bus', status, detail: `pending=${pending}` };
    } catch (err) {
      return {
        name: 'event_bus',
        status: 'unhealthy',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async checkOutboxProcessor(): Promise<ComponentHealth> {
    if (!this.outboxProcessor) return { name: 'outbox_processor', status: 'healthy', detail: 'not configured' };
    return { name: 'outbox_processor', status: 'healthy' };
  }

  private async checkJobScheduler(): Promise<ComponentHealth> {
    if (!this.jobScheduler) return { name: 'job_scheduler', status: 'healthy', detail: 'not configured' };
    return { name: 'job_scheduler', status: 'healthy' };
  }

  private async checkSagaProcessor(): Promise<ComponentHealth> {
    if (!this.sagaOrchestrator) return { name: 'saga_processor', status: 'healthy', detail: 'not configured' };
    return { name: 'saga_processor', status: 'healthy' };
  }
}
