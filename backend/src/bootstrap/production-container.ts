/**
 * Production Composition Root
 *
 * Wires all production dependencies together.
 * This is the ONLY place where infrastructure is instantiated.
 * All wiring is explicit — no hidden magic or dynamic imports.
 */

import { Pool } from 'pg';
import Redis from 'ioredis';

import { createPool, runMigrations } from '../infra/database/connection';
import { PostgresEventBus } from '../infra/messaging/postgres-event-bus';
import { OutboxProcessor } from '../infra/messaging/outbox-processor';
import { PostgresOutboxStore } from '../infra/persistence/postgres-outbox.store';
import { PostgresInboxStore } from '../infra/persistence/postgres-inbox.store';
import { PostgresIdempotencyStore } from '../infra/persistence/postgres-idempotency.store';
import { PostgresSagaStore } from '../infra/persistence/postgres-saga.store';
import { PostgresJobStore } from '../infra/persistence/postgres-job.store';
import { RedisDistributedLock } from '../infra/locks/redis-distributed-lock';
import { SagaOrchestrator } from '../infra/saga/saga-orchestrator';
import { SecureJobScheduler } from '../infra/scheduler/job-scheduler';
import { HealthService } from '../infra/observability/health';
import { SecureLogger } from '../shared/logging/logger';
import { loadAndValidateConfig } from '../shared/config/env.schema';
import type { AppConfig } from '../shared/config/app-config';

export interface ProductionContainer {
  config: AppConfig;
  pgPool: Pool;
  redis: Redis;
  eventBus: PostgresEventBus;
  outboxStore: PostgresOutboxStore;
  inboxStore: PostgresInboxStore;
  idempotencyStore: PostgresIdempotencyStore;
  sagaStore: PostgresSagaStore;
  jobStore: PostgresJobStore;
  distributedLock: RedisDistributedLock;
  outboxProcessor: OutboxProcessor;
  sagaOrchestrator: SagaOrchestrator;
  jobScheduler: SecureJobScheduler;
  healthService: HealthService;
  logger: SecureLogger;
  shutdown(): Promise<void>;
}

/**
 * Bootstrap all production infrastructure.
 * Throws if any required configuration is absent or a dependency fails to connect.
 */
export async function createProductionContainer(): Promise<ProductionContainer> {
  // 1. Validate config — throws on missing required variables
  const config = loadAndValidateConfig(process.env as Record<string, string | undefined>);

  // 2. Logger
  const logger = new SecureLogger();

  logger.info('[container] Initialising production container');

  // 3. PostgreSQL pool
  const pgPool = createPool({ connectionString: config.databaseUrl });

  // 4. Run migrations
  await runMigrations();
  logger.info('[container] Migrations applied');

  // 5. Redis client
  const redis = new Redis(config.redisUrl, {
    enableOfflineQueue: false,
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  });
  redis.on('error', (err: Error) => logger.error('[redis] Connection error', { error: err.message }));

  // 6. Stores
  const outboxStore = new PostgresOutboxStore(pgPool);
  const inboxStore = new PostgresInboxStore(pgPool);
  const idempotencyStore = new PostgresIdempotencyStore(pgPool);
  const sagaStore = new PostgresSagaStore(pgPool);
  const jobStore = new PostgresJobStore(pgPool);

  // 7. Locks
  const distributedLock = new RedisDistributedLock(redis);

  // 8. Durable EventBus
  const eventBus = new PostgresEventBus(pgPool, logger, {
    maxRetries: config.maxRetries,
    pollingIntervalMs: config.outboxPollIntervalMs,
  });
  eventBus.startPolling(config.outboxPollIntervalMs);
  logger.info('[container] EventBus polling started', { intervalMs: config.outboxPollIntervalMs });

  // 9. Outbox processor
  const outboxProcessor = new OutboxProcessor(outboxStore, eventBus, logger);
  outboxProcessor.start(config.outboxPollIntervalMs);
  logger.info('[container] OutboxProcessor started');

  // 10. Saga orchestrator
  const sagaOrchestrator = new SagaOrchestrator(sagaStore, {
    generate: () => require('crypto').randomUUID(),
  });

  // 11. Job scheduler
  const jobScheduler = new SecureJobScheduler(
    jobStore,
    distributedLock,
    logger,
    config.lockTtlSeconds,
  );

  // 12. Health service
  const healthService = new HealthService(
    pgPool,
    redis,
    outboxStore,
    jobStore,
    sagaStore,
    eventBus,
  );

  logger.info('[container] Production container ready');

  const shutdown = async (): Promise<void> => {
    logger.info('[container] Shutting down…');
    outboxProcessor.stop();
    eventBus.stopPolling();
    await redis.quit();
    await pgPool.end();
    logger.info('[container] Shutdown complete');
  };

  return {
    config,
    pgPool,
    redis,
    eventBus,
    outboxStore,
    inboxStore,
    idempotencyStore,
    sagaStore,
    jobStore,
    distributedLock,
    outboxProcessor,
    sagaOrchestrator,
    jobScheduler,
    healthService,
    logger,
    shutdown,
  };
}
