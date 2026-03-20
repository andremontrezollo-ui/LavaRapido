/**
 * Dependency Container — wires infrastructure, modules, and cross-cutting concerns.
 */

import { SecureLogger, type Logger } from '../shared/logging/logger';
import { InMemoryOutboxStore } from '../infra/persistence/outbox.store';
import { InMemoryInboxStore } from '../infra/persistence/inbox.store';
import { InMemoryIdempotencyStore } from '../infra/persistence/idempotency.store';
import { InMemoryDistributedLock } from '../infra/locks/distributed-lock';
import { OutboxProcessor } from '../infra/messaging/outbox-processor';
import { SecureJobScheduler } from '../infra/scheduler/job-scheduler';
import { InMemoryJobStore } from '../infra/scheduler/job.store';
import { ResilientEventBus } from '../shared/events/InMemoryEventBus';
import type { AppConfig } from '../shared/config/app-config';

export interface ReadinessResult {
  isReady: boolean;
  checks: Record<string, { status: string; details?: string }>;
  timestamp: string;
}

export class DependencyContainer {
  readonly logger: Logger;
  readonly outboxStore: InMemoryOutboxStore;
  readonly inboxStore: InMemoryInboxStore;
  readonly idempotencyStore: InMemoryIdempotencyStore;
  readonly distributedLock: InMemoryDistributedLock;
  readonly outboxProcessor: OutboxProcessor;
  readonly jobScheduler: SecureJobScheduler;
  readonly jobStore: InMemoryJobStore;
  readonly eventBus: ResilientEventBus;

  private outboxInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly config: AppConfig) {
    this.logger = new SecureLogger();
    this.inboxStore = new InMemoryInboxStore();
    this.eventBus = new ResilientEventBus(this.inboxStore);
    this.outboxStore = new InMemoryOutboxStore();
    this.idempotencyStore = new InMemoryIdempotencyStore();
    this.distributedLock = new InMemoryDistributedLock();
    this.jobStore = new InMemoryJobStore();
    this.jobScheduler = new SecureJobScheduler(
      this.jobStore,
      this.distributedLock,
      this.logger,
      config.lockTtlSeconds,
    );
    this.outboxProcessor = new OutboxProcessor(
      this.outboxStore,
      this.eventBus,
      this.logger,
    );
  }

  async readinessCheck(): Promise<ReadinessResult> {
    const checks: Record<string, { status: string; details?: string }> = {};

    try {
      const pendingCount = await this.outboxStore.countByStatus('pending');
      const dlqCount = await this.outboxStore.countByStatus('dead_letter');
      checks.outbox = {
        status: dlqCount > 10 ? 'degraded' : 'ok',
        details: `pending=${pendingCount}, dlq=${dlqCount}`,
      };
    } catch {
      checks.outbox = { status: 'error', details: 'Cannot read outbox' };
    }

    try {
      const dueJobs = await this.jobStore.findDue(new Date(), 100);
      checks.scheduler = {
        status: dueJobs.length > 50 ? 'degraded' : 'ok',
        details: `due_jobs=${dueJobs.length}`,
      };
    } catch {
      checks.scheduler = { status: 'error', details: 'Cannot read job store' };
    }

    const hasErrors = Object.values(checks).some(c => c.status === 'error');

    return {
      isReady: !hasErrors,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  startBackgroundTasks(): void {
    this.outboxInterval = setInterval(
      () => {
        this.outboxProcessor.processOnce().catch((err: unknown) => {
          this.logger.error('Outbox background task failed', { error: String(err) });
        });
      },
      this.config.outboxPollIntervalMs,
    );
    this.logger.info('Background tasks started', { pollIntervalMs: this.config.outboxPollIntervalMs });
  }

  stopBackgroundTasks(): void {
    if (this.outboxInterval) {
      clearInterval(this.outboxInterval);
      this.outboxInterval = null;
    }
    this.logger.info('Background tasks stopped');
  }
}
