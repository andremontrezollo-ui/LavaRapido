# LavaRapido Backend — Documentation Hub

> **Repository:** `andremontrezollo-ui/LavaRapido`  
> **Source Code:** [`backend/src/`](../src/)  
> **Last Updated:** 2026-03-11

This is the central documentation index for the LavaRapido backend. All documents reference real source files in `backend/src/` and are kept accurate to the implemented architecture.

---

## Quick Navigation

### Core Documents

| Document | Description |
|----------|-------------|
| [System Overview](./system-overview.md) | What LavaRapido does, bounded contexts, critical flows, operational constraints |
| [Architecture](./architecture.md) | Clean Architecture layers, DDD aggregates, event-driven components, persistence model |
| [Hardening Architecture](./hardening-architecture.md) | Security hardening, patterns, and resilience guarantees |
| [Security Model](./security-model.md) | Authentication, authorization, rate limiting, idempotency, log redaction |
| [Observability](./observability.md) | Structured logging, health checks, correlation IDs, alerting strategy |
| [Deployment Guide](./deployment.md) | Environment variables, startup order, migrations, health checks, rollback |
| [SRE Readiness](./sre-readiness.md) | Production readiness assessment with action plans per dimension |
| [Operational Runbook](./runbook.md) | Quick reference for common operational procedures |

---

### Module Documentation

| Module | Description | Source |
|--------|-------------|--------|
| [address-generator](./modules/address-generator.md) | Generates Bitcoin deposit addresses and issues time-limited tokens | [`src/modules/address-generator/`](../src/modules/address-generator/) |
| [blockchain-monitor](./modules/blockchain-monitor.md) | Monitors on-chain transactions; emits DEPOSIT_DETECTED and DEPOSIT_CONFIRMED | [`src/modules/blockchain-monitor/`](../src/modules/blockchain-monitor/) |
| [liquidity-pool](./modules/liquidity-pool.md) | Manages BTC liquidity reserve; allocates funds for payments | [`src/modules/liquidity-pool/`](../src/modules/liquidity-pool/) |
| [payment-scheduler](./modules/payment-scheduler.md) | Schedules payments with randomized delay; tracks execution lifecycle | [`src/modules/payment-scheduler/`](../src/modules/payment-scheduler/) |
| [log-minimizer](./modules/log-minimizer.md) | Classifies, redacts, and enforces retention on log entries | [`src/modules/log-minimizer/`](../src/modules/log-minimizer/) |
| [deposit-saga](./modules/deposit-saga.md) | Orchestrates the full deposit flow as a saga with compensation | [`src/modules/deposit-saga/`](../src/modules/deposit-saga/) |

---

### Runbooks

| Runbook | Use When |
|---------|----------|
| [Incident Response](./runbooks/incident-response.md) | Any incident — severity classification, escalation flow, postmortem template |
| [Database Failure](./runbooks/database-failure.md) | Supabase/PostgreSQL connectivity errors; startup failure due to missing credentials |
| [Redis Failure](./runbooks/redis-failure.md) | Redis connection errors; rate limiting not functioning |
| [Event Backlog](./runbooks/event-backlog.md) | Outbox pending count growing; events not progressing through the system |
| [Dead Letter Queue](./runbooks/dead-letter-queue.md) | DLQ non-zero; events permanently failed after max retries |
| [Scheduler Failure](./runbooks/scheduler-failure.md) | Payments stuck in SCHEDULED state; due_jobs count growing |

---

### Architecture Decision Records (ADRs)

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](./adr/ADR-001-event-driven-architecture.md) | Event-Driven Architecture with ResilientEventBus | Accepted |
| [ADR-002](./adr/ADR-002-outbox-pattern.md) | Outbox Pattern for Durable Event Publishing | Accepted |
| [ADR-003](./adr/ADR-003-saga-orchestration.md) | Saga Orchestration for Deposit Processing | Accepted |
| [ADR-004](./adr/ADR-004-idempotency-policy.md) | Idempotency Policy for Command Processing | Accepted |
| [ADR-005](./adr/ADR-005-log-minimization.md) | Log Minimization and Sensitive Data Redaction | Accepted |
| [ADR-006](./adr/ADR-006-distributed-locks.md) | Distributed Locks for Concurrent Operation Control | Accepted |
| [ADR-007](./adr/ADR-007-observability-model.md) | Observability Model with Correlation ID Propagation | Accepted |

---

### Diagrams

All diagrams are in [Mermaid](https://mermaid.js.org/) format.

| Diagram | Description |
|---------|-------------|
| [architecture.mmd](./diagrams/architecture.mmd) | Component dependency graph — API → Application → Domain → Infrastructure |
| [event-flow.mmd](./diagrams/event-flow.mmd) | Event flow across modules (DEPOSIT_DETECTED → … → PAYMENT_EXECUTED) |
| [saga-flow.mmd](./diagrams/saga-flow.mmd) | Saga state machine — confirm → reserve → schedule with compensation paths |
| [deployment.mmd](./diagrams/deployment.mmd) | Deployment topology — API, EventBus, PostgreSQL, Redis |
| [failure-recovery.mmd](./diagrams/failure-recovery.mmd) | Failure recovery flows — retry, DLQ, saga compensation, outbox dead letter |

---

## System at a Glance

```
Bitcoin Blockchain
       │
       ▼ webhook / poll
blockchain-monitor
  DEPOSIT_DETECTED ──────────────────────────► EventBus
  DEPOSIT_CONFIRMED ─────────────────────────► deposit-saga ──► SagaOrchestrator
                                                                        │
                              liquidity-pool ◄── Step 2: reserve ───────┤
                              LIQUIDITY_ALLOCATED ─────────────────────►│
                                                                         │
                                         payment-scheduler ◄── Step 3: schedule
                                         PAYMENT_SCHEDULED ─────────────►
                                                  │
                             SecureJobScheduler polls due jobs
                                                  │
                                         PAYMENT_EXECUTED ──────────────► log-minimizer
```

---

## Key Architecture Properties

| Property | Implementation |
|----------|---------------|
| **Architecture** | Clean Architecture + DDD, strict layer boundaries |
| **Modules** | 6 bounded contexts, no direct module-to-module calls |
| **Events** | 20 system event types, all typed in `SystemEvent` union |
| **Reliability** | Outbox (at-least-once delivery) + Inbox (deduplication) + Idempotency (at-most-once processing) |
| **Coordination** | Saga Orchestration with step-level compensation |
| **Security** | Constant-time auth, scope-based authz, rate limiting, log redaction, idempotency |
| **Observability** | Structured NDJSON logging, correlationId propagation, health endpoints |
| **Persistence** | Currently in-memory; migration path to Supabase tables defined |

---

## Getting Started for New Engineers

1. **Understand the domain:** Read [System Overview](./system-overview.md)
2. **Understand the architecture:** Read [Architecture](./architecture.md) and [Hardening Architecture](./hardening-architecture.md)
3. **Understand the security model:** Read [Security Model](./security-model.md)
4. **Set up for local development:** See [Deployment Guide](./deployment.md)
5. **Understand operational expectations:** Read [SRE Readiness](./sre-readiness.md) and [Observability](./observability.md)
6. **Understand the key decisions:** Read [ADR-001](./adr/ADR-001-event-driven-architecture.md) through [ADR-007](./adr/ADR-007-observability-model.md)
7. **Work on a specific module:** Find it in [Module Documentation](#module-documentation)
