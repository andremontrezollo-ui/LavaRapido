/**
 * Production Dependency Container — wires all durable implementations.
 * Uses PostgreSQL + Redis exclusively; in-memory implementations are test-only.
 *
 * Required environment variables (application fails to start if missing):
 *   DATABASE_URL   — PostgreSQL connection string
 *   REDIS_URL      — Redis connection string
 *   JWT_SECRET     — JWT signing secret
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { createPool, checkDatabaseConnectivity } from '../infra/database/connection';
import { PostgresOutboxStore } from '../infra/persistence/postgres-outbox-store';
import { PostgresInboxStore } from '../infra/persistence/postgres-inbox-store';
import { PostgresIdempotencyStore } from '../infra/persistence/postgres-idempotency-store';
import { PostgresSagaStore } from '../infra/saga/postgres-saga-store';
import { PostgresJobStore } from '../infra/scheduler/postgres-job-store';
import { RedisDistributedLock } from '../infra/locks/redis-distributed-lock';
import { PostgresEventBus } from '../infra/messaging/postgres-event-bus';
import { OutboxProcessor } from '../infra/messaging/outbox-processor';
import { SagaOrchestrator } from '../infra/saga/saga-orchestrator';
import { SecureJobScheduler } from '../infra/scheduler/job-scheduler';
import { SecureLogger } from '../shared/logging/logger';
import { ProductionHealthChecker } from '../infra/observability/health';
import type { Logger } from '../shared/logging/logger';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export interface ProductionContainer {
  pool: Pool;
  redis: Redis;
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
  logger: Logger;
  healthChecker: ProductionHealthChecker;
  shutdown(): Promise<void>;
}

/**
 * Bootstrap all production dependencies.
 * Call once at application startup; fails fast on missing config.
 */
export async function createProductionContainer(): Promise<ProductionContainer> {
  // 1. Validate required secrets — fail fast before touching any infrastructure
  requireEnv('DATABASE_URL');
  requireEnv('REDIS_URL');
  requireEnv('JWT_SECRET');

  const logger = new SecureLogger();

  // 2. PostgreSQL pool
  const pool = createPool({ connectionString: process.env.DATABASE_URL! });
  await checkDatabaseConnectivity();
  logger.info('PostgreSQL connected');

  // 3. Redis client
  const redis = new Redis(process.env.REDIS_URL!, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  await redis.ping();
  logger.info('Redis connected');

  // 4. Persistent stores
  const outboxStore = new PostgresOutboxStore(pool);
  const inboxStore = new PostgresInboxStore(pool);
  const idempotencyStore = new PostgresIdempotencyStore(pool);
  const sagaStore = new PostgresSagaStore(pool);
  const jobStore = new PostgresJobStore(pool);

  // 5. Distributed lock (Redis-backed)
  const distributedLock = new RedisDistributedLock(redis);

  // 6. Durable event bus
  const eventBus = new PostgresEventBus(
    pool,
    { maxRetries: parseInt(process.env.MAX_RETRIES ?? '3', 10) },
    logger,
  );

  // 7. Outbox processor
  const outboxProcessor = new OutboxProcessor(outboxStore, eventBus, logger);

  // 8. Saga orchestrator
  const sagaOrchestrator = new SagaOrchestrator(sagaStore, { generate: () => crypto.randomUUID() });

  // 9. Job scheduler (uses Redis distributed lock)
  const jobScheduler = new SecureJobScheduler(
    jobStore,
    distributedLock,
    logger,
    parseInt(process.env.LOCK_TTL_SECONDS ?? '30', 10),
  );

  // 10. Health checker
  const healthChecker = new ProductionHealthChecker(pool, redis, outboxStore, jobStore);

  async function shutdown(): Promise<void> {
    outboxProcessor.stop();
    await redis.quit();
    await pool.end();
    logger.info('Production container shut down cleanly');
  }

  return {
    pool,
    redis,
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
    logger,
    healthChecker,
    shutdown,
  };
}
