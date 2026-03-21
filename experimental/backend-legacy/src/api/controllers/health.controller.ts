/**
 * Health Check Controller — liveness and readiness endpoints.
 */

import type { OutboxStore } from '../../shared/events/outbox-message';
import type { JobStore } from '../../infra/scheduler/job-scheduler';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; details?: string }>;
  uptime: number;
  timestamp: string;
}

export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly outbox: OutboxStore | null = null,
    private readonly jobStore: JobStore | null = null,
  ) {}

  async liveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  async readiness(): Promise<HealthStatus> {
    const checks: Record<string, { status: string; details?: string }> = {};

    // Check outbox
    if (this.outbox) {
      try {
        const pendingCount = await this.outbox.countByStatus('pending');
        const dlqCount = await this.outbox.countByStatus('dead_letter');
        checks.outbox = {
          status: dlqCount > 10 ? 'degraded' : 'ok',
          details: `pending=${pendingCount}, dlq=${dlqCount}`,
        };
      } catch {
        checks.outbox = { status: 'error', details: 'Cannot read outbox' };
      }
    }

    // Check scheduler
    if (this.jobStore) {
      try {
        const dueJobs = await this.jobStore.findDue(new Date(), 100);
        checks.scheduler = {
          status: dueJobs.length > 50 ? 'degraded' : 'ok',
          details: `due_jobs=${dueJobs.length}`,
        };
      } catch {
        checks.scheduler = { status: 'error', details: 'Cannot read job store' };
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
