# LavaRapido Backend — SRE Readiness Assessment

> **Related:** [Architecture](./architecture.md) · [Observability](./observability.md) · [Deployment](./deployment.md) · [Runbooks](./runbooks/)

---

## Summary

This document provides a formal SRE readiness assessment for the LavaRapido backend. Each dimension is classified as `READY`, `PARTIAL`, or `NOT READY` with a specific action plan to reach `READY` status.

**Assessment date:** 2026-03-11  
**Assessed version:** Current `main` branch

---

## Readiness Matrix

| Dimension | Status | Notes |
|-----------|--------|-------|
| Single-instance operation | **READY** | Fully functional with in-memory stores |
| State durability | **PARTIAL** | All stores are in-memory; state lost on restart |
| Failure recovery | **PARTIAL** | Outbox/Saga/DLQ implemented but depend on in-memory persistence |
| Multi-instance operation | **NOT READY** | Locks and stores are process-local |
| Horizontal scaling | **NOT READY** | No distributed coordination between instances |
| Deployment safety | **PARTIAL** | No documented rolling deployment strategy |
| Observability | **PARTIAL** | Structured logs present; metrics and tracing absent |
| Incident response | **PARTIAL** | Runbooks created; alerting not instrumented |
| Secret management | **READY** | Environment variables, fail-fast validation |
| Input validation | **READY** | Zod schema validation on all endpoints |
| Authentication | **READY** | Constant-time bearer token validation |
| Authorization | **READY** | Scope-based per-endpoint access control |
| Rate limiting | **PARTIAL** | Implemented; Redis store available but in-memory is default |

---

## Dimension Details and Action Plans

### Single-Instance Operation — READY

**Current state:** All modules function correctly in a single-process deployment. Event bus, saga, scheduler, outbox, and idempotency all operate within a single Node.js process.

**No action required** for single-instance deployments.

---

### State Durability — PARTIAL

**Current state:** All persistence stores (`OutboxStore`, `InboxStore`, `IdempotencyStore`, `SagaStore`, `JobStore`, module repositories) are backed by in-memory `Map` objects. A process restart results in complete state loss.

**Risk:**
- Pending outbox messages are lost on restart → events are not delivered
- Active sagas are lost → no compensation is triggered; deposits may be stranded
- Idempotency records are lost → operations may re-execute after restart
- Scheduled payments are lost → payments are never executed

**Action Plan to Reach READY:**

| Step | Action | Target File |
|------|--------|-------------|
| 1 | Implement `SupabaseOutboxStore` backed by `outbox_messages` table | `infra/persistence/outbox.store.ts` |
| 2 | Implement `SupabaseInboxStore` backed by `inbox_messages` table | `infra/persistence/inbox.store.ts` |
| 3 | Implement `SupabaseIdempotencyStore` backed by `idempotency_records` table | `infra/persistence/idempotency.store.ts` |
| 4 | Implement `SupabaseSagaStore` backed by `saga_states` table | `infra/saga/saga.store.ts` |
| 5 | Implement `SupabaseJobStore` backed by `scheduled_jobs` table | `infra/scheduler/job.store.ts` |
| 6 | Implement Supabase-backed module repositories | `modules/*/infra/repositories/` |
| 7 | Apply Supabase migrations for all tables | `supabase/migrations/` |
| 8 | Swap store implementations in `app/application.ts` | `app/application.ts` |

---

### Failure Recovery — PARTIAL

**Current state:** The system has robust failure recovery mechanisms in code:
- `OutboxProcessor` retries failed messages with backoff; moves to dead letter after 5 failures
- `SagaOrchestrator` compensates completed steps in reverse order on failure
- `SecureJobScheduler` moves jobs to dead letter after `maxAttempts`
- `ResilientEventBus` retries handlers with exponential backoff; quarantines in DLQ after `maxRetries`

**Gap:** All these mechanisms rely on in-memory stores. A process restart abandons all recovery state.

**Action Plan to Reach READY:**
1. Complete State Durability actions above
2. Implement restart recovery: on startup, query for `status = 'pending'` outbox messages and re-queue them
3. Implement saga recovery: on startup, query for `status = 'compensating'` sagas and resume compensation
4. Add health check for DLQ counts — alert when non-zero (see [Observability](./observability.md))

---

### Multi-Instance Operation — NOT READY

**Current state:** All stores and the distributed lock are process-local. Running two instances concurrently would cause:
- Double-processing of outbox messages (two processors reading the same pending messages)
- Double-processing of jobs (two schedulers executing the same due job)
- Invalid idempotency checks (each instance has a separate store)
- Race conditions in saga execution

**Action Plan to Reach READY:**

| Step | Action |
|------|--------|
| 1 | Complete State Durability actions (shared Supabase stores) |
| 2 | Implement `SupabaseAdvisoryLock` using `pg_advisory_xact_lock` | 
| 3 | Use Supabase `SELECT FOR UPDATE SKIP LOCKED` for outbox polling |
| 4 | Use Supabase `SELECT FOR UPDATE SKIP LOCKED` for job polling |
| 5 | Validate idempotency checks work correctly under concurrent access (database-level uniqueness constraints) |
| 6 | Load test with 2+ concurrent instances |

---

### Horizontal Scaling — NOT READY

**Current state:** Same as multi-instance. No load balancing, no shared state.

**Action Plan to Reach READY:**
1. Complete Multi-Instance Operation actions
2. Ensure the `OutboxProcessor` and `SecureJobScheduler` use distributed locking to prevent duplicate processing
3. Configure Redis for rate limiting across instances (use `RedisRateLimitStore` from [`infra/rate-limit/redis-rate-limit-store.ts`](../src/infra/rate-limit/redis-rate-limit-store.ts))
4. Add load balancer health check integration (`/health` and `/health/ready`)
5. Document maximum safe concurrency for current Supabase connection pool

---

### Deployment Safety — PARTIAL

**Current state:** The application starts up and fails fast on missing configuration. No rolling deployment strategy is documented.

**Gap:**
- No zero-downtime deployment procedure
- No pre-deployment schema migration strategy
- No rollback procedure for failed deployments

**Action Plan to Reach READY:**
1. Document startup sequence (see [Deployment Guide](./deployment.md))
2. Implement pre-deployment migration hooks using Supabase migrations
3. Add readiness probe to deployment pipeline — only route traffic when `/health/ready` returns `healthy`
4. Document rollback procedure: revert image, verify `/health/ready`, check DLQ counts
5. Implement database schema versioning with forward-compatible migrations

---

### Observability — PARTIAL

**Current state:** Structured logging is implemented with `SecureLogger`. `correlationId` is propagated across request → event → saga chains.

**Gap:**
- No metrics instrumentation (Prometheus, StatsD, or equivalent)
- No distributed tracing (OpenTelemetry, Jaeger)
- No alerting rules configured

**Action Plan to Reach READY:**
1. Add Prometheus metrics client; instrument `OutboxProcessor`, `ResilientEventBus`, `SagaOrchestrator`, `SecureJobScheduler`
2. Integrate OpenTelemetry SDK; trace from HTTP request through event handlers to persistence
3. Configure alerting rules for critical thresholds (see [Observability — Alerting Strategy](./observability.md#alerting-strategy-recommended))
4. Add Grafana dashboards for key metrics
5. Configure log aggregation (Supabase Logflare, Datadog, or equivalent)

---

### Incident Response — PARTIAL

**Current state:** Runbooks have been created. No alerting to trigger them automatically.

**Action Plan to Reach READY:**
1. Complete Observability actions
2. Configure PagerDuty or equivalent alert routing
3. Conduct tabletop exercises for each runbook scenario
4. Define on-call rotation and escalation path

---

## Production Readiness Checklist

Before promoting to production with durability guarantees:

```
Infrastructure
  [ ] Supabase tables created for all stores (outbox, inbox, idempotency, saga, jobs, repositories)
  [ ] Redis instance provisioned for rate limiting
  [ ] Environment variables configured in deployment platform
  [ ] TLS/HTTPS termination at load balancer

Reliability
  [ ] OutboxStore backed by Supabase with SKIP LOCKED polling
  [ ] SagaStore backed by Supabase
  [ ] DistributedLock backed by pg_advisory_lock
  [ ] Startup recovery for pending outbox messages and active sagas

Observability
  [ ] Metrics instrumented and published
  [ ] Alerting rules configured for DLQ, saga compensation, payment latency
  [ ] Log aggregation configured

Operations
  [ ] Runbooks reviewed and validated
  [ ] On-call rotation established
  [ ] Rollback procedure tested
  [ ] Load test at expected peak throughput
```
