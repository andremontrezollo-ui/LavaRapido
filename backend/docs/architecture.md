# LavaRapido Backend — Architecture

> **Related:** [System Overview](./system-overview.md) · [Hardening Architecture](./hardening-architecture.md) · [Security Model](./security-model.md) · [Diagrams](./diagrams/)

---

## Layered Architecture

LavaRapido enforces a **strict dependency rule**: outer layers depend on inner layers; inner layers have no knowledge of outer layers.

```
┌─────────────────────────────────────────────────────────────┐
│  Interface Layer (api/)                                      │
│  Controllers · Middlewares · Schemas · Security · Errors     │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (modules/*/application/)                  │
│  Use Cases · DTOs · Ports · Idempotency Guards               │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer (modules/*/domain/)                            │
│  Aggregates · Value Objects · Domain Events · Policies       │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer (infra/ + modules/*/infra/)            │
│  Persistence · Messaging · Locks · Saga · Scheduler          │
├─────────────────────────────────────────────────────────────┤
│  Shared Kernel (shared/)                                     │
│  Events · HTTP · Ports · Policies · Config · Logging         │
└─────────────────────────────────────────────────────────────┘
```

See [`diagrams/architecture.mmd`](./diagrams/architecture.mmd) for a Mermaid diagram.

---

## Clean Architecture Boundaries

### Dependency Rule

```
api/ → modules/*/application/ → modules/*/domain/
infra/ → shared/
modules/*/infra/ → modules/*/application/
```

The domain layer has **no external dependencies** — it is pure TypeScript with no framework, no ORM, no HTTP client.

### Port and Adapter Pattern

Each module defines **ports** (interfaces) in its `application/ports/` directory. Infrastructure adapters implement these ports:

```
application/ports/address-repository.port.ts   ← interface
infra/repositories/address.repository.ts       ← in-memory implementation
```

This allows test doubles and production adapters to be swapped without changing application logic.

---

## API Layer

**Source:** [`backend/src/api/`](../src/api/)

The API layer is an Express.js HTTP server that exposes REST endpoints and applies the middleware stack.

### Controllers

| Controller | File | Endpoints |
|------------|------|-----------|
| `HealthController` | [`api/controllers/health.controller.ts`](../src/api/controllers/health.controller.ts) | `GET /health` (liveness), `GET /health/ready` (readiness) |

The `HealthController` checks `OutboxStore` (DLQ count) and `JobStore` (due job count) to determine service health status (`healthy` / `degraded` / `unhealthy`).

### Middlewares

| Middleware | File | Responsibility |
|------------|------|----------------|
| `AuthMiddleware` | [`api/middlewares/auth.middleware.ts`](../src/api/middlewares/auth.middleware.ts) | Bearer token validation (constant-time comparison) |
| `AuthorizationMiddleware` | [`api/middlewares/authorization.middleware.ts`](../src/api/middlewares/authorization.middleware.ts) | Scope-based access control per endpoint |
| `RateLimitMiddleware` | [`api/middlewares/rate-limit.middleware.ts`](../src/api/middlewares/rate-limit.middleware.ts) | Per-IP per-endpoint rate limiting |
| `CorrelationIdMiddleware` | [`api/middlewares/correlation-id.middleware.ts`](../src/api/middlewares/correlation-id.middleware.ts) | Propagates or generates `X-Correlation-ID` |
| `RequestLoggingMiddleware` | [`api/middlewares/request-logging.middleware.ts`](../src/api/middlewares/request-logging.middleware.ts) | Structured, redacted request/response logging |

### Validation

Request bodies are validated using Zod schemas defined in [`api/schemas/validation.schemas.ts`](../src/api/schemas/validation.schemas.ts). Invalid requests return structured `400 Bad Request` responses.

### Error Handling

[`api/errors/error-handler.ts`](../src/api/errors/error-handler.ts) maps domain errors to safe HTTP responses. Domain error types are never exposed verbatim to callers.

### Security Headers

[`infra/security/SecurityHeaders.ts`](../src/infra/security/SecurityHeaders.ts) applies HTTP security headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`.

---

## Application Layer

**Source:** `backend/src/modules/*/application/`

Each module's application layer contains:

- **Use cases** — stateless orchestrators that implement a single business operation
- **DTOs** — request/response data shapes crossing layer boundaries
- **Ports** — interfaces that infrastructure must implement

### Idempotency Guards

Critical use cases wrap their execution in an `IdempotencyGuard` to prevent duplicate processing:

```typescript
// backend/src/shared/policies/idempotency-policy.ts
const result = await idempotencyGuard.executeOnce(key, async () => {
  // runs at most once per key within TTL
});
```

| Use Case | Idempotency Key |
|----------|----------------|
| `ConfirmDepositUseCase` | `confirm-deposit:{txId}:{confirmations}` |
| `AllocateLiquidityUseCase` | `allocate:{allocationId}` |
| `SchedulePaymentUseCase` | `schedule:{destination}:{amount}:{delay}` |
| `MarkPaymentExecutedUseCase` | `execute-payment:{paymentId}` |

**Source:** [`backend/src/shared/policies/idempotency-policy.ts`](../src/shared/policies/idempotency-policy.ts)

---

## Domain Layer

**Source:** `backend/src/modules/*/domain/`

Each module's domain layer contains:

- **Aggregates / Entities** — objects with identity, lifecycle, and business invariants
- **Value Objects** — immutable, equality-by-value objects
- **Domain Events** — facts that occurred within a bounded context
- **Policies** — explicit, named business rules that return boolean or structured results
- **Errors** — domain-specific error types

### DDD Aggregates per Module

| Module | Aggregate Root | Key Value Objects |
|--------|---------------|-------------------|
| address-generator | `Address`, `AddressToken` | `BitcoinAddress`, `AddressNamespace` |
| blockchain-monitor | `ObservedTransaction` | `Txid`, `BlockHeight`, `ConfirmationCount`, `MonitoredAddress` |
| liquidity-pool | `LiquidityPool`, `Obligation` | `Amount`, `ObligationId`, `ReserveId` |
| payment-scheduler | `ScheduledPayment`, `PaymentOrder` | `ExecutionTime`, `ScheduledPaymentId`, `DestinationReference` |
| log-minimizer | `LogEntry`, `RetentionRule` | `LogLevel`, `RetentionWindow`, `SensitivityClassification` |

### Domain Events

Domain events are defined in each module's `domain/events/` directory and typed in the shared `SystemEvent` union in [`backend/src/shared/events/DomainEvent.ts`](../src/shared/events/DomainEvent.ts).

All domain events carry:
- `type` — discriminant string
- `timestamp` — event occurrence time
- `aggregateId?` — ID of the emitting aggregate
- `correlationId?` — trace ID propagated across module boundaries
- `causationId?` — ID of the event that caused this event
- `metadata?` — arbitrary key/value pairs

---

## Infrastructure Layer

**Source:** [`backend/src/infra/`](../src/infra/) and `backend/src/modules/*/infra/`

### Persistence Stores

All stores are currently **in-memory**. Production deployments must replace these with Supabase-backed implementations.

| Store | File | Purpose |
|-------|------|---------|
| `InMemoryOutboxStore` | [`infra/persistence/outbox.store.ts`](../src/infra/persistence/outbox.store.ts) | Transactional event persistence before publication |
| `InMemoryInboxStore` | [`infra/persistence/inbox.store.ts`](../src/infra/persistence/inbox.store.ts) | Event deduplication by `(eventId, handlerName)` |
| `InMemoryIdempotencyStore` | [`infra/persistence/idempotency.store.ts`](../src/infra/persistence/idempotency.store.ts) | At-most-once operation records with TTL |
| `InMemorySagaStore` | [`infra/saga/saga.store.ts`](../src/infra/saga/saga.store.ts) | Saga state persistence |
| `InMemoryJobStore` | [`infra/scheduler/job.store.ts`](../src/infra/scheduler/job.store.ts) | Scheduled job state |

Module-level repositories in `modules/*/infra/repositories/` provide aggregate persistence (also in-memory, connected to Supabase via `infra/database/connection.ts`).

### Messaging

#### OutboxProcessor

[`infra/messaging/outbox-processor.ts`](../src/infra/messaging/outbox-processor.ts) polls `OutboxStore` for pending messages and publishes them via `EventBus`.

```
OutboxProcessor.processOnce()
  ├── outbox.findPending(batchSize=10)
  ├── eventBus.publish(event)
  ├── outbox.markPublished(id)
  └── on failure: outbox.markFailed(id) → after 5 failures: dead_letter
```

The `start(intervalMs)` method runs a continuous poll loop. `stop()` terminates it gracefully.

#### ResilientEventBus

[`shared/events/InMemoryEventBus.ts`](../src/shared/events/InMemoryEventBus.ts) implements `EventBus`:

- **Retry:** exponential backoff, `maxRetries` attempts (default: 3)
- **Deduplication:** checks `InboxStore` before executing each handler; records after success
- **DLQ:** failed events after max retries are added to in-memory dead letter queue
- **Manual retry:** `retryDeadLetter(eventId)` allows reprocessing

### Distributed Locks

[`shared/ports/DistributedLock.ts`](../src/shared/ports/DistributedLock.ts) defines the `DistributedLock` port. [`infra/locks/distributed-lock.ts`](../src/infra/locks/distributed-lock.ts) provides a process-local implementation.

Lock keys:
- Payment execution: `payment-exec:{paymentId}`
- Job processing: `job:{jobId}`

**Production requirement:** Replace with Supabase advisory locks (`pg_advisory_lock`) for multi-instance deployments.

### Saga Orchestrator

[`infra/saga/saga-orchestrator.ts`](../src/infra/saga/saga-orchestrator.ts) executes a sequence of `SagaStep` objects. On failure, it compensates completed steps in reverse order.

Saga states: `started → step_completed → completed` or `started → step_completed → compensating → compensated | failed`

### Job Scheduler

[`infra/scheduler/job-scheduler.ts`](../src/infra/scheduler/job-scheduler.ts) (`SecureJobScheduler`) polls `JobStore` for due jobs, acquires a distributed lock per job, and executes them via a provided executor function.

On failure: increments `attempts`; after `maxAttempts` → moves to `dead_letter`.

---

## Shared Kernel

**Source:** [`backend/src/shared/`](../src/shared/)

The shared kernel contains abstractions and utilities used across all modules. It has **no dependency on any module**.

| Directory | Contents |
|-----------|---------|
| `shared/events/` | `DomainEvent`, `SystemEvent` union, `EventBus` interface, `ResilientEventBus`, `OutboxMessage`, `InboxMessage` |
| `shared/http/` | `HttpStatus`, `ApiResponse`, `ErrorResponse`, `RequestContext` |
| `shared/ports/` | `Clock`, `DistributedLock`, `IdGenerator`, `Repository` base interfaces |
| `shared/policies/` | `Policy`, `ExplainablePolicy`, `IdempotencyGuard`, `ReplayProtectionPolicy` |
| `shared/config/` | `AppConfig`, `loadConfig()`, `validateEnvSchema()` |
| `shared/logging/` | `Logger`, `SecureLogger`, `DefaultRedactionPolicy`, `buildSafeContext()` |

### Configuration

[`shared/config/load-config.ts`](../src/shared/config/load-config.ts) validates all environment variables at startup using [`shared/config/env.schema.ts`](../src/shared/config/env.schema.ts). Missing required variables cause an immediate process exit (fail-fast).

See [Deployment Guide](./deployment.md) for the complete environment variable reference.

---

## State Persistence Model

| Component | Current State | Production Target |
|-----------|--------------|-------------------|
| `OutboxStore` | In-memory `Map` | Supabase table `outbox_messages` |
| `InboxStore` | In-memory `Map` | Supabase table `inbox_messages` |
| `IdempotencyStore` | In-memory `Map` with TTL | Supabase table `idempotency_records` |
| `SagaStore` | In-memory `Map` | Supabase table `saga_states` |
| `JobStore` | In-memory `Map` | Supabase table + Redis for scheduling |
| `RateLimitStore` | In-memory `Map` | Redis (`RedisRateLimitStore` in [`infra/rate-limit/redis-rate-limit-store.ts`](../src/infra/rate-limit/redis-rate-limit-store.ts)) |
| Module repositories | In-memory arrays/maps | Supabase tables per module |
| `DistributedLock` | Process-local `Set` | Supabase `pg_advisory_lock` |

The `RedisRateLimitStore` ([`infra/rate-limit/redis-rate-limit-store.ts`](../src/infra/rate-limit/redis-rate-limit-store.ts)) is already implemented for rate limiting. All other stores require Supabase migration before multi-instance deployment.
