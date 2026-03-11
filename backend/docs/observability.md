# LavaRapido Backend — Observability Guide

> **Related:** [Architecture](./architecture.md) · [SRE Readiness](./sre-readiness.md) · [Runbooks](./runbooks/)

---

## Overview

LavaRapido's observability model is built on three pillars: **structured logging**, **health endpoints**, and **correlation ID propagation**. Metrics and distributed tracing are currently not instrumented (see [SRE Readiness](./sre-readiness.md)).

---

## Structured Logging

### Implementation

**Source:** [`backend/src/shared/logging/logger.ts`](../src/shared/logging/logger.ts)

All logging is performed through the `SecureLogger` class, which applies `DefaultRedactionPolicy` before any output is emitted. Logs are written as newline-delimited JSON (NDJSON) to stdout/stderr.

```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;           // redacted string
  timestamp: string;         // ISO 8601
  correlationId?: string;    // trace ID
  context?: Record<string, unknown>;  // safe, redacted fields
}
```

### Standard Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | `debug`, `info`, `warn`, `error` |
| `message` | string | Human-readable event description (redacted) |
| `timestamp` | string | ISO 8601 UTC timestamp |
| `correlationId` | string? | Trace ID propagated across module calls |
| `context.module` | string? | Module emitting the log |
| `context.action` | string? | Use case or operation name |
| `context.step` | string? | Sub-step within an operation |
| `context.status` | string? | Outcome (`ok`, `failed`, `retrying`) |
| `context.count` | number? | Quantity (e.g., items processed) |
| `context.duration` | number? | Duration in milliseconds |
| `context.method` | string? | HTTP method |
| `context.path` | string? | HTTP path |
| `context.statusCode` | number? | HTTP response code |

### Log Redaction

**Source:** [`backend/src/shared/logging/redaction-policy.ts`](../src/shared/logging/redaction-policy.ts)

`DefaultRedactionPolicy` applies the following rules before any log is emitted:

#### Pattern-Based String Redaction

| Pattern | Replacement |
|---------|-------------|
| Bitcoin legacy/P2SH addresses (`[13][a-km-zA-HJ-NP-Z1-9]{25,34}`) | `[BTC_ADDR]` |
| Bitcoin bech32 addresses (`bc1[a-z0-9]{39,59}`) | `[BTC_BECH32]` |
| IPv4 addresses | `[IP_REDACTED]` |
| 64-char hex strings (txids, private keys) | `[HASH_REDACTED]` |
| JWT tokens (`eyJ...`) | `[JWT_REDACTED]` |

#### Field-Level Redaction

Fields whose names contain any of the following substrings are redacted entirely (replaced with `[REDACTED]`):

`password`, `secret`, `token`, `key`, `authorization`, `cookie`, `private`, `credential`, `ssn`, `credit_card`, `card_number`, `cvv`, `pin`, `passphrase`, `mnemonic`, `seed`

#### Allowed Fields (Whitelist)

Only the following fields pass through without field-level redaction:

`level`, `message`, `timestamp`, `correlationId`, `requestId`, `method`, `path`, `statusCode`, `duration`, `module`, `action`, `step`, `status`, `count`, `reason`, `eventType`

#### Value Truncation

String values longer than 200 characters are truncated with `...[TRUNCATED]`.

### Logger Usage

```typescript
// Create a module-scoped logger
const logger = new SecureLogger(new DefaultRedactionPolicy(), correlationId, { module: 'liquidity-pool' });

// Create a child logger for a use case
const useCaseLogger = logger.child({ action: 'allocate-liquidity' });
useCaseLogger.info('Allocation started', { amount: 0.5 });
// → {"level":"info","message":"Allocation started","timestamp":"...","correlationId":"...","context":{"module":"liquidity-pool","action":"allocate-liquidity","amount":0.5}}
```

**Source:** [`backend/src/infra/observability/StructuredLogger.ts`](../src/infra/observability/StructuredLogger.ts)

---

## Correlation ID Propagation

**Source:** [`backend/src/api/middlewares/correlation-id.middleware.ts`](../src/api/middlewares/correlation-id.middleware.ts)

Every inbound HTTP request receives a `correlationId`:
1. If `X-Correlation-ID` header is present, it is used as-is.
2. Otherwise, a new UUID is generated.

The `correlationId` is:
- Attached to the `RequestContext` for the duration of the request
- Passed to all `SecureLogger` instances created within the request scope
- Embedded in all domain events via the `correlationId` field on `DomainEvent`
- Returned in the `X-Correlation-ID` response header

This allows a single `correlationId` to be traced across: HTTP request → use case → domain event → event handler → saga step → outbox message → job execution.

---

## Health Endpoints

**Source:** [`backend/src/api/controllers/health.controller.ts`](../src/api/controllers/health.controller.ts)

### Liveness: `GET /health`

Returns `200 OK` with `{ "status": "ok" }` if the process is alive.

Use this endpoint for container liveness probes (Kubernetes, Fly.io, etc.).

### Readiness: `GET /health/ready`

Returns a detailed readiness status:

```json
{
  "status": "healthy | degraded | unhealthy",
  "checks": {
    "outbox": { "status": "ok | degraded | error", "details": "pending=3, dlq=0" },
    "scheduler": { "status": "ok | degraded | error", "details": "due_jobs=2" }
  },
  "uptime": 3600,
  "timestamp": "2026-03-11T11:42:28.115Z"
}
```

#### Status Determination

| Condition | Status |
|-----------|--------|
| All checks pass | `healthy` |
| Any check degraded | `degraded` |
| Any check errored | `unhealthy` |

#### Degraded Thresholds

| Check | Degraded When |
|-------|--------------|
| `outbox` | `dlq > 10` dead letter messages |
| `scheduler` | `due_jobs > 50` pending jobs |

Use the readiness endpoint for load balancer health checks and deployment readiness gates.

---

## Metrics (Not Yet Instrumented)

The following metrics are recommended for production observability. They are not currently emitted but can be derived from log events:

| Metric | Description | Suggested Alert |
|--------|-------------|----------------|
| `outbox_pending_count` | Messages awaiting publication | Alert if > 100 for > 5 min |
| `outbox_dlq_count` | Messages in dead letter | Alert if > 0 |
| `event_handler_retry_rate` | Retries per handler per minute | Alert if > 10/min |
| `saga_compensation_rate` | Sagas entering compensation per hour | Alert if > 5/hour |
| `payment_execution_latency_p99` | P99 latency from scheduled to executed | Alert if > 600s |
| `rate_limit_reject_rate` | Requests rejected by rate limiter | Alert if > 20% of requests |
| `job_dlq_count` | Jobs moved to dead letter | Alert if > 0 |
| `idempotency_cache_hit_rate` | Cache hits on idempotency store | Informational |

To instrument, add metric emission in `OutboxProcessor`, `ResilientEventBus`, `SagaOrchestrator`, and `SecureJobScheduler`.

---

## Distributed Tracing (Not Yet Instrumented)

The `correlationId` field provides single-trace context. For distributed tracing (Jaeger, Zipkin, OpenTelemetry), the following integration points are recommended:

| Integration Point | File |
|------------------|------|
| HTTP request span start | [`api/middlewares/correlation-id.middleware.ts`](../src/api/middlewares/correlation-id.middleware.ts) |
| Use case span | Each `application/use-cases/*.usecase.ts` |
| Event publish span | [`shared/events/InMemoryEventBus.ts`](../src/shared/events/InMemoryEventBus.ts) |
| Outbox publish span | [`infra/messaging/outbox-processor.ts`](../src/infra/messaging/outbox-processor.ts) |
| Job execution span | [`infra/scheduler/job-scheduler.ts`](../src/infra/scheduler/job-scheduler.ts) |

---

## Alerting Strategy (Recommended)

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Outbox DLQ growing | `outbox_dlq_count > 0` for 5 minutes | SEV-2 | Run [Dead Letter Queue Runbook](./runbooks/dead-letter-queue.md) |
| Event handler retry spike | > 10 retries/minute | SEV-3 | Investigate [Event Backlog Runbook](./runbooks/event-backlog.md) |
| Readiness endpoint degraded | `/health/ready` returns `degraded` for > 2 minutes | SEV-3 | Check scheduler and outbox status |
| Readiness endpoint unhealthy | `/health/ready` returns `unhealthy` | SEV-1 | Run [Incident Response](./runbooks/incident-response.md) |
| Saga compensation triggered | Any `SAGA_COMPENSATION_TRIGGERED` event | SEV-2 | Investigate saga context and correlationId |
| Rate limit threshold exceeded | > 30% requests rate limited | SEV-3 | Review client behavior; adjust limits if legitimate traffic |
