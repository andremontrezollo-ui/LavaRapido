# LavaRapido Backend — System Overview

> **Related:** [Architecture](./architecture.md) · [Security Model](./security-model.md) · [Deployment](./deployment.md) · [SRE Readiness](./sre-readiness.md)

---

## System Purpose

LavaRapido is a **Bitcoin transaction processing backend** that ingests on-chain deposits, allocates liquidity from a managed pool, and schedules forward payments to one or more destination addresses. The system applies randomized delay and amount distribution to each output, providing operational privacy for transaction participants.

The backend is designed as a **stateless-first, event-driven service** intended to run as a Supabase Edge Function or equivalent serverless runtime. All coordination between modules is performed through an internal event bus with reliability guarantees (retry, deduplication, DLQ, and saga compensation).

---

## Primary Architecture Style

| Dimension | Choice |
|-----------|--------|
| **Layering** | Clean Architecture — strict `domain → application → infrastructure → interfaces` dependency rule |
| **Domain design** | Domain-Driven Design (DDD) — aggregates, value objects, domain events per bounded context |
| **Inter-module communication** | Event-Driven — `ResilientEventBus` with retry, DLQ, and deduplication |
| **Process coordination** | Saga Orchestration — `SagaOrchestrator` with step-level compensation |
| **Durability** | Outbox Pattern — events are persisted before publication; `OutboxProcessor` polls and delivers |
| **Deduplication** | Inbox Pattern — `InboxStore` deduplicates by `(eventId, handlerName)` |
| **Idempotency** | `IdempotencyGuard` — at-most-once semantics per operation key with TTL |
| **Concurrency control** | Distributed Locks — `DistributedLock` port with process-local implementation |

---

## Bounded Contexts

Each module is an independent **bounded context** with its own domain model, application layer, infrastructure adapters, and published events. Modules communicate exclusively via events on the shared `EventBus`.

### `address-generator`

**Responsibility:** Generate Bitcoin deposit addresses and issue time-limited address tokens.

| Layer | Key Files |
|-------|-----------|
| Domain | [`address.entity.ts`](../src/modules/address-generator/domain/entities/address.entity.ts) · [`bitcoin-address.vo.ts`](../src/modules/address-generator/domain/value-objects/bitcoin-address.vo.ts) · [`address-namespace.vo.ts`](../src/modules/address-generator/domain/value-objects/address-namespace.vo.ts) |
| Application | [`generate-address.usecase.ts`](../src/modules/address-generator/application/use-cases/generate-address.usecase.ts) · [`issue-address-token.usecase.ts`](../src/modules/address-generator/application/use-cases/issue-address-token.usecase.ts) |
| Events published | `ADDRESS_TOKEN_EMITTED`, `ADDRESS_TOKEN_RESOLVED`, `ADDRESS_TOKEN_EXPIRED` |
| Policies | `AddressExpirationPolicy`, `AddressGenerationPolicy` |

### `blockchain-monitor`

**Responsibility:** Monitor on-chain transactions for watched addresses, track confirmation counts, and detect chain reorganizations.

| Layer | Key Files |
|-------|-----------|
| Domain | [`observed-transaction.entity.ts`](../src/modules/blockchain-monitor/domain/entities/observed-transaction.entity.ts) · [`confirmation-state.entity.ts`](../src/modules/blockchain-monitor/domain/entities/confirmation-state.entity.ts) · [`txid.vo.ts`](../src/modules/blockchain-monitor/domain/value-objects/txid.vo.ts) |
| Application | [`ingest-blockchain-event.usecase.ts`](../src/modules/blockchain-monitor/application/use-cases/ingest-blockchain-event.usecase.ts) · [`confirm-deposit.usecase.ts`](../src/modules/blockchain-monitor/application/use-cases/confirm-deposit.usecase.ts) · [`reconcile-observed-transactions.usecase.ts`](../src/modules/blockchain-monitor/application/use-cases/reconcile-observed-transactions.usecase.ts) |
| Events published | `DEPOSIT_DETECTED`, `DEPOSIT_CONFIRMED`, `TRANSACTION_REORG_DETECTED` |
| Policies | `ConfirmationThresholdPolicy`, `ReorgTolerancePolicy` |

### `liquidity-pool`

**Responsibility:** Maintain a liquidity reserve, allocate funds for scheduled payments, and emit health warnings when utilization exceeds thresholds.

| Layer | Key Files |
|-------|-----------|
| Domain | [`liquidity-pool.entity.ts`](../src/modules/liquidity-pool/domain/entities/liquidity-pool.entity.ts) · [`obligation.entity.ts`](../src/modules/liquidity-pool/domain/entities/obligation.entity.ts) · [`amount.vo.ts`](../src/modules/liquidity-pool/domain/value-objects/amount.vo.ts) |
| Application | [`allocate-liquidity.usecase.ts`](../src/modules/liquidity-pool/application/use-cases/allocate-liquidity.usecase.ts) · [`reserve-obligation.usecase.ts`](../src/modules/liquidity-pool/application/use-cases/reserve-obligation.usecase.ts) · [`register-deposit-credit.usecase.ts`](../src/modules/liquidity-pool/application/use-cases/register-deposit-credit.usecase.ts) |
| Events published | `LIQUIDITY_ALLOCATED`, `OBLIGATION_RESERVED`, `POOL_HEALTH_WARNING`, `POOL_REBALANCED` |
| Policies | `AllocationPolicy`, `PoolHealthPolicy`, `ReserveThresholdPolicy` |

### `payment-scheduler`

**Responsibility:** Schedule outgoing payments with randomized delay, track execution state, and emit lifecycle events.

| Layer | Key Files |
|-------|-----------|
| Domain | [`scheduled-payment.entity.ts`](../src/modules/payment-scheduler/domain/entities/scheduled-payment.entity.ts) · [`payment-order.entity.ts`](../src/modules/payment-scheduler/domain/entities/payment-order.entity.ts) · [`execution-time.vo.ts`](../src/modules/payment-scheduler/domain/value-objects/execution-time.vo.ts) |
| Application | [`schedule-payment.usecase.ts`](../src/modules/payment-scheduler/application/use-cases/schedule-payment.usecase.ts) · [`get-due-payments.usecase.ts`](../src/modules/payment-scheduler/application/use-cases/get-due-payments.usecase.ts) · [`mark-payment-executed.usecase.ts`](../src/modules/payment-scheduler/application/use-cases/mark-payment-executed.usecase.ts) |
| Events published | `PAYMENT_SCHEDULED`, `PAYMENT_DUE`, `PAYMENT_EXECUTED`, `PAYMENT_CANCELLED` |
| Policies | `PaymentDelayPolicy`, `SchedulingWindowPolicy`, `ExecutionEligibilityPolicy` |

### `log-minimizer`

**Responsibility:** Classify, redact, and enforce retention policies on log entries to minimize PII and sensitive data exposure.

| Layer | Key Files |
|-------|-----------|
| Domain | [`log-entry.entity.ts`](../src/modules/log-minimizer/domain/entities/log-entry.entity.ts) · [`redaction-result.entity.ts`](../src/modules/log-minimizer/domain/entities/redaction-result.entity.ts) · [`sensitivity-classification.vo.ts`](../src/modules/log-minimizer/domain/value-objects/sensitivity-classification.vo.ts) |
| Application | [`redact-log-entry.usecase.ts`](../src/modules/log-minimizer/application/use-cases/redact-log-entry.usecase.ts) · [`purge-expired-logs.usecase.ts`](../src/modules/log-minimizer/application/use-cases/purge-expired-logs.usecase.ts) · [`enforce-retention-policy.usecase.ts`](../src/modules/log-minimizer/application/use-cases/enforce-retention-policy.usecase.ts) |
| Events published | `LOG_REDACTED`, `LOG_PURGED` |
| Policies | `FieldRedactionPolicy`, `LogRetentionPolicy`, `LoggingEligibilityPolicy` |

### `deposit-saga`

**Responsibility:** Orchestrate the full deposit processing flow — confirm deposit → reserve liquidity → schedule payments — with step-level compensation on failure.

| Layer | Key Files |
|-------|-----------|
| Saga definition | [`deposit-processing.saga.ts`](../src/modules/deposit-saga/deposit-processing.saga.ts) |
| Infrastructure | [`SagaOrchestrator`](../src/infra/saga/saga-orchestrator.ts) · [`SagaStore`](../src/infra/saga/saga.store.ts) |
| Events consumed | `DEPOSIT_CONFIRMED` |
| Events emitted (via infra) | `SAGA_STEP_COMPLETED`, `SAGA_COMPENSATION_TRIGGERED` |

---

## Critical Flows

### 1. Deposit Detection and Confirmation

```
External webhook / polling
    │
    ▼
ingest-blockchain-event.usecase.ts
    │  validates TXID, records ObservedTransaction
    ▼
DEPOSIT_DETECTED published → EventBus
    │
    ▼ (on sufficient confirmations)
confirm-deposit.usecase.ts
    │  updates ConfirmationState
    ▼
DEPOSIT_CONFIRMED published → EventBus
```

**Idempotency key:** `confirm-deposit:{txId}:{confirmations}`  
**Source:** [`confirm-deposit.usecase.ts`](../src/modules/blockchain-monitor/application/use-cases/confirm-deposit.usecase.ts)

### 2. Liquidity Allocation

```
DEPOSIT_CONFIRMED consumed by LiquidityPool handler
    │
    ▼
allocate-liquidity.usecase.ts
    │  checks PoolHealthPolicy, reserves funds
    ▼
LIQUIDITY_ALLOCATED published → EventBus
    │
    ▼ (if utilization > threshold)
POOL_HEALTH_WARNING published → EventBus
```

**Idempotency key:** `allocate:{allocationId}`  
**Source:** [`allocate-liquidity.usecase.ts`](../src/modules/liquidity-pool/application/use-cases/allocate-liquidity.usecase.ts)

### 3. Payment Scheduling and Execution

```
LIQUIDITY_ALLOCATED consumed by PaymentScheduler handler
    │
    ▼
schedule-payment.usecase.ts
    │  applies PaymentDelayPolicy (60–360s jitter)
    ▼
PAYMENT_SCHEDULED published → EventBus
    │
    ▼ (JobScheduler polls due payments)
get-due-payments.usecase.ts → mark-payment-executed.usecase.ts
    │
    ▼
PAYMENT_EXECUTED published → EventBus
```

**Idempotency key:** `schedule:{destination}:{amount}:{delay}`  
**Source:** [`schedule-payment.usecase.ts`](../src/modules/payment-scheduler/application/use-cases/schedule-payment.usecase.ts)

### 4. Deposit Saga (Full Flow)

```
DepositSagaContext { txId, amount, destinations, poolId, correlationId }
    │
    ▼
SagaOrchestrator.execute('deposit-processing', steps)
    │
    ├─ Step 1: confirm_deposit
    │       compensate: markDepositUnprocessed
    ├─ Step 2: reserve_liquidity
    │       compensate: releaseLiquidity
    └─ Step 3: schedule_payments
            compensate: (no-op — payments expire)
```

**Source:** [`deposit-processing.saga.ts`](../src/modules/deposit-saga/deposit-processing.saga.ts)

---

## Operational Constraints

| Constraint | Detail |
|------------|--------|
| **Single-instance only** | All stores (`OutboxStore`, `InboxStore`, `IdempotencyStore`, `SagaStore`, `JobStore`) are in-memory. State is lost on restart. |
| **No horizontal scaling** | `DistributedLock` is process-local; concurrent instances will cause double-processing. |
| **No durable event log** | The `ResilientEventBus` does not persist events beyond the process lifecycle. Outbox mitigates this for domain events, but replay across restarts requires Supabase-backed stores. |
| **Confirmation threshold** | Configurable via `CONFIRMATION_THRESHOLD` env var (default: 6 blocks). |
| **Rate limiting** | Per-IP per-endpoint: default 10 requests / 600 seconds. Configurable via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MINUTES`. |
| **Outbox polling interval** | Configurable via `OUTBOX_POLL_INTERVAL_MS` (default varies). Controls event delivery latency. |
| **Idempotency TTL** | Default 3600 seconds (1 hour). Records expire and allow re-processing after TTL. |

---

## System Event Taxonomy

All 20 system events are defined in [`backend/src/shared/events/DomainEvent.ts`](../src/shared/events/DomainEvent.ts):

| Module | Event |
|--------|-------|
| address-generator | `ADDRESS_TOKEN_EMITTED`, `ADDRESS_TOKEN_RESOLVED`, `ADDRESS_TOKEN_EXPIRED` |
| blockchain-monitor | `DEPOSIT_DETECTED`, `DEPOSIT_CONFIRMED`, `TRANSACTION_REORG_DETECTED` |
| liquidity-pool | `LIQUIDITY_ALLOCATED`, `OBLIGATION_RESERVED`, `POOL_HEALTH_WARNING`, `POOL_REBALANCED` |
| payment-scheduler | `PAYMENT_SCHEDULED`, `PAYMENT_DUE`, `PAYMENT_EXECUTED`, `PAYMENT_CANCELLED` |
| log-minimizer | `LOG_REDACTED`, `LOG_PURGED` |
| infra/session | `SESSION_CREATED`, `SESSION_EXPIRED` |
| infra/saga | `SAGA_STEP_COMPLETED`, `SAGA_COMPENSATION_TRIGGERED` |

All events carry: `type`, `timestamp`, and optionally `aggregateId`, `correlationId`, `causationId`, `metadata`. Integration events also carry `eventId` (for deduplication) and `source`.
