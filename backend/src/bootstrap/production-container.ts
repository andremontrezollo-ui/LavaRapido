/**
 * Production Composition Root — explicit wiring of all infrastructure components.
 * No implicit wiring. Every dependency is initialized and connected here.
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { connectWithRetry, closePool } from '../infra/database/connection';
import { TransactionManager } from '../infra/database/transaction-manager';
import { PostgresOutboxStore } from '../infra/persistence/postgres-outbox.store';
import { PostgresInboxStore } from '../infra/persistence/postgres-inbox.store';
import { PostgresIdempotencyStore } from '../infra/persistence/postgres-idempotency.store';
import { PostgresSagaStore } from '../infra/saga/postgres-saga.store';
import { PostgresJobStore } from '../infra/scheduler/postgres-job.store';
import { RedisDistributedLock } from '../infra/locks/redis-distributed-lock';
import { PostgresEventBus } from '../infra/messaging/postgres-event-bus';
import { OutboxProcessor } from '../infra/messaging/outbox-processor';
import { SagaOrchestrator } from '../infra/saga/saga-orchestrator';
import { SecureJobScheduler } from '../infra/scheduler/job-scheduler';
import { HealthChecker } from '../infra/observability/health';
import { SecureLogger } from '../shared/logging/logger';

export interface ProductionContainer {
  pool: Pool;
  redis: Redis;
  transactionManager: TransactionManager;
  outboxStore: PostgresOutboxStore;
  inboxStore: PostgresInboxStore;
  idempotencyStore: PostgresIdempotencyStore;
  sagaStore: PostgresSagaStore;
  jobStore: PostgresJobStore;
  distributedLock: RedisDistributedLock;
  eventBus: PostgresEventBus;
  outboxProcessor: OutboxProcessor;
  sagaOrchestrator: SagaOrchestrator;
  jobScheduler: SecureJobScheduler;
  healthChecker: HealthChecker;
  logger: SecureLogger;
  shutdown(): Promise<void>;
}

export async function buildProductionContainer(): Promise<ProductionContainer> {
  // ── Logger ────────────────────────────────────────────────────────────────
  const logger = new SecureLogger();

  logger.info('Booting production container', {});

  // ── PostgreSQL ────────────────────────────────────────────────────────────
  const pool = await connectWithRetry();
  logger.info('PostgreSQL pool connected', {});

  // ── Redis ─────────────────────────────────────────────────────────────────
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(redisUrl, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  await new Promise<void>((resolve, reject) => {
    redis.once('ready', resolve);
    redis.once('error', reject);
  });
  logger.info('Redis connected', {});

  // ── Stores ────────────────────────────────────────────────────────────────
  const outboxStore = new PostgresOutboxStore(pool);
  const inboxStore = new PostgresInboxStore(pool);
  const idempotencyStore = new PostgresIdempotencyStore(pool);
  const sagaStore = new PostgresSagaStore(pool);
  const jobStore = new PostgresJobStore(pool);
  const transactionManager = new TransactionManager(pool);

  // ── Distributed Lock ──────────────────────────────────────────────────────
  const distributedLock = new RedisDistributedLock(redis);

  // ── Event Bus ─────────────────────────────────────────────────────────────
  const eventBus = new PostgresEventBus(pool, inboxStore, logger);

  // ── Outbox Processor ──────────────────────────────────────────────────────
  const outboxProcessor = new OutboxProcessor(outboxStore, eventBus, logger);

  // ── Saga Orchestrator ─────────────────────────────────────────────────────
  const sagaOrchestrator = new SagaOrchestrator(sagaStore, {
    generate: () => require('crypto').randomUUID(),
  });

  // ── Job Scheduler ─────────────────────────────────────────────────────────
  const lockTtlSeconds = Number(process.env.LOCK_TTL_SECONDS ?? 30);
  const jobScheduler = new SecureJobScheduler(jobStore, distributedLock, logger, lockTtlSeconds);

  // ── Health Checker ────────────────────────────────────────────────────────
  const healthChecker = new HealthChecker(
    pool,
    redis,
    eventBus,
    outboxProcessor,
    jobScheduler,
    sagaOrchestrator,
  );

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  async function shutdown(): Promise<void> {
    logger.info('Shutting down production container', {});
    eventBus.stopPolling();
    outboxProcessor.stop();
    await redis.quit();
    await closePool();
    logger.info('Production container shut down cleanly', {});
  }

  logger.info('Production container ready', {});

  return {
    pool,
    redis,
    transactionManager,
    outboxStore,
    inboxStore,
    idempotencyStore,
    sagaStore,
    jobStore,
    distributedLock,
    eventBus,
    outboxProcessor,
    sagaOrchestrator,
    jobScheduler,
    healthChecker,
    logger,
    shutdown,
  };
}
