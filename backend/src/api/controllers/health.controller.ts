/**
 * Health Check Controller — liveness and readiness endpoints.
 *
 * /health  → liveness: is the process up?
 * /readiness → readiness: can the process safely serve traffic?
 */

import type { OutboxStore } from '../../shared/events/outbox-message';
import type { JobStore } from '../../infra/scheduler/job-scheduler';
import type { DistributedLock } from '../../shared/ports/DistributedLock';

export interface CheckResult {
  status: 'ok' | 'degraded' | 'error';
  details?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  uptime: number;
  timestamp: string;
}

export interface ReadinessConfig {
  outboxDlqThreshold?: number;
  outboxBacklogThreshold?: number;
  schedulerBacklogThreshold?: number;
}

export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly outbox: OutboxStore | null = null,
    private readonly jobStore: JobStore | null = null,
    private readonly lock: DistributedLock | null = null,
    private readonly config: ReadinessConfig = {},
  ) {}

  /** Liveness — only checks whether the process is alive. */
  async liveness(): Promise<{ status: string; timestamp: string }> {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Readiness — deep check of all critical dependencies. */
  async readiness(): Promise<HealthStatus> {
    const checks: Record<string, CheckResult> = {};
    const dlqThreshold = this.config.outboxDlqThreshold ?? 10;
    const backlogThreshold = this.config.outboxBacklogThreshold ?? 500;
    const schedulerThreshold = this.config.schedulerBacklogThreshold ?? 50;

    // 1. Outbox backlog + DLQ
    if (this.outbox) {
      try {
        const pending = await this.outbox.countByStatus('pending');
        const failed = await this.outbox.countByStatus('failed');
        const dlq = await this.outbox.countByStatus('dead_letter');
        const st = dlq > dlqThreshold ? 'degraded' : pending > backlogThreshold ? 'degraded' : 'ok';
        checks.outbox = { status: st, details: `pending=${pending}, failed=${failed}, dlq=${dlq}` };
      } catch (e) {
        checks.outbox = { status: 'error', details: `Cannot read outbox: ${String(e)}` };
      }
    }

    // 2. Scheduler health
    if (this.jobStore) {
      try {
        const due = await this.jobStore.findDue(new Date(), 200);
        const st = due.length > schedulerThreshold ? 'degraded' : 'ok';
        checks.scheduler = { status: st, details: `due_jobs=${due.length}` };
      } catch (e) {
        checks.scheduler = { status: 'error', details: `Cannot read job store: ${String(e)}` };
      }
    }

    // 3. Distributed lock probe
    if (this.lock) {
      try {
        const probeKey = '__health_probe__';
        const acquired = await this.lock.acquire(probeKey, 2);
        if (acquired) {
          await this.lock.release(probeKey);
          checks.lock = { status: 'ok', details: 'probe acquired and released' };
        } else {
          checks.lock = { status: 'degraded', details: 'probe lock already held — possible stale lock' };
        }
      } catch (e) {
        checks.lock = { status: 'error', details: `Lock probe failed: ${String(e)}` };
      }
    }

    const hasErrors = Object.values(checks).some(c => c.status === 'error');
    const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');

    return {
      status: hasErrors ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
