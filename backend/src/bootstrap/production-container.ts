/**
 * Production Container — single composition root that wires all dependencies.
 * Called exactly once at process startup from src/index.ts.
 * All in-memory stores are replaced with PostgreSQL/Redis-backed implementations.
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { getPool } from '../infra/database/connection';
import { TransactionManager } from '../infra/database/transaction-manager';
import { PostgresOutboxStore } from '../infra/persistence/postgres-outbox-store';
import { PostgresInboxStore } from '../infra/persistence/postgres-inbox-store';
import { PostgresIdempotencyStore } from '../infra/persistence/postgres-idempotency-store';
import { PostgresSagaStore } from '../infra/saga/postgres-saga-store';
import { PostgresJobStore } from '../infra/scheduler/postgres-job-store';
import { RedisDistributedLock } from '../infra/locks/redis-distributed-lock';
import { RedisRateLimitStore } from '../infra/rate-limit/redis-rate-limit-store';
import { PostgresEventBus } from '../infra/messaging/postgres-event-bus';
import { OutboxProcessor } from '../infra/messaging/outbox-processor';
import { SecureJobScheduler } from '../infra/scheduler/job-scheduler';
import { SagaOrchestrator } from '../infra/saga/saga-orchestrator';
import { InfrastructureHealthChecker } from '../infra/observability/health';
import { HealthController } from '../api/controllers/health.controller';
import { RateLimitMiddleware } from '../api/middlewares/rate-limit.middleware';
import { AuthMiddleware } from '../api/middlewares/auth.middleware';
import { SecureLogger } from '../shared/logging/logger';
import { loadConfig } from '../shared/config/load-config';
import type { DependencyContainer, ReadinessCheck } from '../app/dependency-container';

export class ProductionContainer implements DependencyContainer {
  readonly pool: Pool;
  readonly redis: Redis;
  readonly logger: SecureLogger;
  readonly txManager: TransactionManager;
  readonly outboxStore: PostgresOutboxStore;
  readonly inboxStore: PostgresInboxStore;
  readonly idempotencyStore: PostgresIdempotencyStore;
  readonly sagaStore: PostgresSagaStore;
  readonly jobStore: PostgresJobStore;
  readonly distributedLock: RedisDistributedLock;
  readonly rateLimitStore: RedisRateLimitStore;
  readonly eventBus: PostgresEventBus;
  readonly outboxProcessor: OutboxProcessor;
  readonly jobScheduler: SecureJobScheduler;
  readonly sagaOrchestrator: SagaOrchestrator;
  readonly healthChecker: InfrastructureHealthChecker;
  readonly healthController: HealthController;
  readonly rateLimitMiddleware: RateLimitMiddleware;
  readonly authMiddleware: AuthMiddleware;

  constructor() {
    const config = loadConfig();

    this.logger = new SecureLogger();

    this.pool = getPool();

    if (!config.redisUrl) {
      throw new Error('Missing required environment variable: REDIS_URL');
    }
    this.redis = new Redis(config.redisUrl, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    this.txManager = new TransactionManager();
    this.outboxStore = new PostgresOutboxStore(this.pool);
    this.inboxStore = new PostgresInboxStore(this.pool);
    this.idempotencyStore = new PostgresIdempotencyStore(this.pool);
    this.sagaStore = new PostgresSagaStore(this.pool);
    this.jobStore = new PostgresJobStore(this.pool);
    this.distributedLock = new RedisDistributedLock(this.redis);
    this.rateLimitStore = new RedisRateLimitStore(this.redis);

    this.eventBus = new PostgresEventBus(this.pool, this.logger, {
      maxRetries: config.maxRetries,
    });

    this.outboxProcessor = new OutboxProcessor(
      this.outboxStore,
      this.eventBus,
      this.logger,
    );

    this.jobScheduler = new SecureJobScheduler(
      this.jobStore,
      this.distributedLock,
      this.logger,
      config.lockTtlSeconds,
    );

    this.sagaOrchestrator = new SagaOrchestrator(
      this.sagaStore,
      { generate: () => require('crypto').randomUUID() },
    );

    this.healthChecker = new InfrastructureHealthChecker(
      this.pool,
      this.redis,
      this.outboxStore,
      this.jobStore,
      this.sagaStore,
    );

    this.healthController = new HealthController(
      this.healthChecker,
      this.outboxStore,
      this.jobStore,
    );

    this.rateLimitMiddleware = new RateLimitMiddleware(
      this.rateLimitStore,
      config.rateLimitMaxRequests,
      config.rateLimitWindowMinutes * 60,
    );

    const serviceRoleKey = config.supabaseServiceRoleKey;
    if (!serviceRoleKey) {
      throw new Error(
        'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY. ' +
        'Required for AuthMiddleware to validate service-role tokens.',
      );
    }

    this.authMiddleware = new AuthMiddleware(
      serviceRoleKey,
      this.logger,
    );
  }

  async readinessCheck(): Promise<ReadinessCheck> {
    return this.healthChecker.check();
  }

  async dispose(): Promise<void> {
    this.outboxProcessor.stop();
    await this.redis.quit();
    await this.pool.end();
  }
}

let container: ProductionContainer | null = null;

export function getProductionContainer(): ProductionContainer {
  if (!container) {
    container = new ProductionContainer();
  }
  return container;
}
