/**
 * Dependency Container — composition root for production.
 * Wires all durable infrastructure implementations (PostgreSQL, Redis).
 * InMemory implementations are NOT used here.
 */

import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { getPool } from '../infra/database/connection';
import { PostgresOutboxStore } from '../infra/persistence/postgres-outbox-store';
import { PostgresInboxStore } from '../infra/persistence/postgres-inbox-store';
import { PostgresIdempotencyStore } from '../infra/persistence/postgres-idempotency-store';
import { PostgresJobStore } from '../infra/persistence/postgres-job-store';
import { PostgresSagaStore } from '../infra/persistence/postgres-saga-store';
import { RedisDistributedLock } from '../infra/locks/redis-distributed-lock';
import { RedisRateLimitStore } from '../infra/rate-limit/redis-rate-limit-store';
import { DurableEventBus } from '../infra/messaging/durable-event-bus';
import { OutboxProcessor } from '../infra/messaging/outbox-processor';
import { SagaOrchestrator } from '../infra/saga/saga-orchestrator';
import { SecureJobScheduler } from '../infra/scheduler/job-scheduler';
import { HealthCheck } from '../infra/observability/health';
import { ReadinessCheck } from '../infra/observability/readiness';
import type { ReadinessReport } from '../infra/observability/readiness';
import { SecureLogger } from '../shared/logging/logger';

export class DependencyContainer {
  private readonly redis: Redis;
  private readonly outboxStore: PostgresOutboxStore;
  private readonly inboxStore: PostgresInboxStore;
  private readonly idempotencyStore: PostgresIdempotencyStore;
  private readonly jobStore: PostgresJobStore;
  private readonly sagaStore: PostgresSagaStore;
  readonly distributedLock: RedisDistributedLock;
  readonly rateLimitStore: RedisRateLimitStore;
  readonly eventBus: DurableEventBus;
  readonly outboxProcessor: OutboxProcessor;
  readonly sagaOrchestrator: SagaOrchestrator;
  readonly scheduler: SecureJobScheduler;
  readonly health: HealthCheck;
  private readonly readiness: ReadinessCheck;
  private readonly logger: SecureLogger;
  private readonly outboxPollIntervalMs: number;

  constructor(
    redisUrl: string = process.env.REDIS_URL ?? 'redis://localhost:6379',
    outboxPollIntervalMs: number = 5000,
    maxRetries: number = 3,
    lockTtlSeconds: number = 30,
  ) {
    this.logger = new SecureLogger();
    this.outboxPollIntervalMs = outboxPollIntervalMs;
    this.redis = new Redis(redisUrl, { lazyConnect: true });
    const pool = getPool();

    this.outboxStore = new PostgresOutboxStore(pool);
    this.inboxStore = new PostgresInboxStore(pool);
    this.idempotencyStore = new PostgresIdempotencyStore(pool);
    this.jobStore = new PostgresJobStore(pool);
    this.sagaStore = new PostgresSagaStore(pool);

    this.distributedLock = new RedisDistributedLock(this.redis);
    this.rateLimitStore = new RedisRateLimitStore(this.redis);

    this.eventBus = new DurableEventBus(this.outboxStore, this.inboxStore);
    this.outboxProcessor = new OutboxProcessor(this.outboxStore, this.eventBus, this.logger);

    this.sagaOrchestrator = new SagaOrchestrator(this.sagaStore, { generate: () => randomUUID() });
    this.scheduler = new SecureJobScheduler(this.jobStore, this.distributedLock, this.logger, lockTtlSeconds);

    this.health = new HealthCheck(pool, this.redis);
    this.readiness = new ReadinessCheck(pool, this.redis);
  }

  async readinessCheck(): Promise<ReadinessReport> {
    return this.readiness.checkAll();
  }

  async connect(): Promise<void> {
    await this.redis.connect();
    this.outboxProcessor.start(this.outboxPollIntervalMs).catch((err) =>
      this.logger.error('OutboxProcessor fatal error', { error: String(err) }),
    );
  }

  async disconnect(): Promise<void> {
    this.outboxProcessor.stop();
    await this.redis.quit();
    const { closePool } = await import('../infra/database/connection');
    await closePool();
  }
}
