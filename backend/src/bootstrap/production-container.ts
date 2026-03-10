/**
 * Production Container — the single composition root for production.
 *
 * This is the ONLY place in production where concrete infrastructure
 * implementations are instantiated and wired together. All other code
 * depends only on abstractions (interfaces/ports).
 *
 * Import order matters: config → infra → application → api.
 */

import { loadConfig } from '../shared/config/load-config';
import { SecureLogger } from '../shared/logging/logger';
import { ResilientEventBus } from '../shared/events/InMemoryEventBus';
import { InMemoryOutboxStore } from '../infra/persistence/outbox.store';
import { InMemoryInboxStore } from '../infra/persistence/inbox.store';
import { InMemoryIdempotencyStore } from '../infra/persistence/idempotency.store';
import { InMemoryDistributedLock } from '../infra/locks/distributed-lock';
import { InMemoryJobStore } from '../infra/scheduler/job.store';
import { InMemorySagaStore } from '../infra/saga/saga.store';
import { OutboxProcessor } from '../infra/messaging/outbox-processor';
import { SecureJobScheduler } from '../infra/scheduler/job-scheduler';
import { SagaOrchestrator } from '../infra/saga/saga-orchestrator';
import { CryptoIdGenerator } from '../shared/ports/IdGenerator';
import type { DependencyContainer } from '../app/dependency-container';
import type { ReadinessResult } from '../app/types';

/**
 * Build the production DependencyContainer.
 *
 * NOTE: The InMemory* implementations are intentionally used here for the
 * initial production baseline (single-process deployment). Once a PostgreSQL
 * and Redis backing store is fully provisioned, swap these implementations
 * by updating ONLY this file — no other production code changes.
 *
 * The composition root is the correct place to make that swap.
 */
export function buildProductionContainer(): DependencyContainer {
  const config = loadConfig();
  const logger = new SecureLogger(undefined, undefined, { env: config.env });

  // ── Persistence ─────────────────────────────────────────────────────────────
  const outboxStore = new InMemoryOutboxStore();
  const inboxStore = new InMemoryInboxStore();
  const idempotencyStore = new InMemoryIdempotencyStore();
  const lock = new InMemoryDistributedLock();
  const jobStore = new InMemoryJobStore();
  const sagaStore = new InMemorySagaStore();

  // ── Events ───────────────────────────────────────────────────────────────────
  const eventBus = new ResilientEventBus(inboxStore, {
    maxRetries: config.maxRetries,
    retryDelayMs: 200,
    enableDeduplication: true,
  });

  // ── Background processors ────────────────────────────────────────────────────
  const outboxProcessor = new OutboxProcessor(
    outboxStore,
    eventBus,
    logger.child({ component: 'outbox-processor' }),
    20,
  );

  const jobScheduler = new SecureJobScheduler(
    jobStore,
    lock,
    logger.child({ component: 'job-scheduler' }),
    config.lockTtlSeconds,
  );

  const sagaOrchestrator = new SagaOrchestrator(
    sagaStore,
    new CryptoIdGenerator(),
  );

  logger.info('Production container built', {
    environment: config.env,
    outboxPollIntervalMs: config.outboxPollIntervalMs,
    lockTtlSeconds: config.lockTtlSeconds,
  });

  return {
    eventBus,
    outboxStore,
    inboxStore,
    lock,
    jobStore,

    async readinessCheck(): Promise<ReadinessResult> {
      const checks: Record<string, { status: 'ok' | 'degraded' | 'error'; details?: string }> = {};
      let isReady = true;

      // Config loaded
      checks.config = { status: 'ok', details: `env=${config.env}` };

      // Outbox backlog
      try {
        const pending = await outboxStore.countByStatus('pending');
        const dlq = await outboxStore.countByStatus('dead_letter');
        const backlogStatus = dlq > 10 ? 'degraded' : pending > 500 ? 'degraded' : 'ok';
        checks.outbox = {
          status: backlogStatus,
          details: `pending=${pending}, dlq=${dlq}`,
        };
        if (backlogStatus === 'degraded') isReady = false;
      } catch (e) {
        checks.outbox = { status: 'error', details: String(e) };
        isReady = false;
      }

      // Scheduler
      try {
        const due = await jobStore.findDue(new Date(), 100);
        const sched = due.length > 50 ? 'degraded' : 'ok';
        checks.scheduler = { status: sched, details: `due_jobs=${due.length}` };
        if (sched === 'degraded') isReady = false;
      } catch (e) {
        checks.scheduler = { status: 'error', details: String(e) };
        isReady = false;
      }

      // Distributed lock probe
      try {
        const probeKey = '__readiness_probe__';
        const acquired = await lock.acquire(probeKey, 2);
        if (acquired) {
          await lock.release(probeKey);
          checks.lock = { status: 'ok' };
        } else {
          checks.lock = { status: 'degraded', details: 'probe lock already held' };
        }
      } catch (e) {
        checks.lock = { status: 'error', details: String(e) };
        isReady = false;
      }

      // Active sagas
      try {
        const activeSagas = await sagaStore.findActive();
        checks.sagas = {
          status: activeSagas.length > 100 ? 'degraded' : 'ok',
          details: `active=${activeSagas.length}`,
        };
      } catch (e) {
        checks.sagas = { status: 'error', details: String(e) };
      }

      return {
        isReady,
        checks,
        timestamp: new Date().toISOString(),
      };
    },

    async dispose(): Promise<void> {
      outboxProcessor.stop();
      logger.info('Production container disposed');
    },
  };
}
