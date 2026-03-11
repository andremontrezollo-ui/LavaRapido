# Module: blockchain-monitor

> **Source:** [`backend/src/modules/blockchain-monitor/`](../../src/modules/blockchain-monitor/)  
> **Related:** [System Overview](../system-overview.md) · [Architecture](../architecture.md)

---

## Purpose

The `blockchain-monitor` module tracks Bitcoin on-chain transactions for watched addresses. It processes raw blockchain events, advances confirmation state, detects chain reorganizations, and publishes `DEPOSIT_DETECTED` and `DEPOSIT_CONFIRMED` events to trigger downstream processing via the deposit saga.

---

## Domain Model

### Entities

| Entity | File | Description |
|--------|------|-------------|
| `ObservedTransaction` | [`domain/entities/observed-transaction.entity.ts`](../../src/modules/blockchain-monitor/domain/entities/observed-transaction.entity.ts) | A transaction being tracked for confirmation |
| `ConfirmationState` | [`domain/entities/confirmation-state.entity.ts`](../../src/modules/blockchain-monitor/domain/entities/confirmation-state.entity.ts) | Tracks current confirmation count and block height |
| `BlockObservation` | [`domain/entities/block-observation.entity.ts`](../../src/modules/blockchain-monitor/domain/entities/block-observation.entity.ts) | A single block observation event |

### Value Objects

| Value Object | File | Description |
|-------------|------|-------------|
| `Txid` | [`domain/value-objects/txid.vo.ts`](../../src/modules/blockchain-monitor/domain/value-objects/txid.vo.ts) | Validated 64-char hex transaction ID |
| `BlockHeight` | [`domain/value-objects/block-height.vo.ts`](../../src/modules/blockchain-monitor/domain/value-objects/block-height.vo.ts) | Non-negative block number |
| `ConfirmationCount` | [`domain/value-objects/confirmation-count.vo.ts`](../../src/modules/blockchain-monitor/domain/value-objects/confirmation-count.vo.ts) | Number of confirmations (>= 0) |
| `MonitoredAddress` | [`domain/value-objects/monitored-address.vo.ts`](../../src/modules/blockchain-monitor/domain/value-objects/monitored-address.vo.ts) | A Bitcoin address being watched |

### Domain Events

| Event | File | Description |
|-------|------|-------------|
| `DEPOSIT_DETECTED` | [`domain/events/deposit-detected.event.ts`](../../src/modules/blockchain-monitor/domain/events/deposit-detected.event.ts) | Transaction first seen in mempool or block |
| `DEPOSIT_CONFIRMED` | [`domain/events/deposit-confirmed.event.ts`](../../src/modules/blockchain-monitor/domain/events/deposit-confirmed.event.ts) | Transaction has reached the confirmation threshold |
| `TRANSACTION_REORG_DETECTED` | [`domain/events/transaction-reorg-detected.event.ts`](../../src/modules/blockchain-monitor/domain/events/transaction-reorg-detected.event.ts) | A chain reorganization affected a tracked transaction |

### Domain Errors

| Error | File |
|-------|------|
| `InvalidTxidError` | [`domain/errors/invalid-txid.error.ts`](../../src/modules/blockchain-monitor/domain/errors/invalid-txid.error.ts) |
| `InconsistentConfirmationStateError` | [`domain/errors/inconsistent-confirmation-state.error.ts`](../../src/modules/blockchain-monitor/domain/errors/inconsistent-confirmation-state.error.ts) |
| `UnsupportedSourceEventError` | [`domain/errors/unsupported-source-event.error.ts`](../../src/modules/blockchain-monitor/domain/errors/unsupported-source-event.error.ts) |

### Policies

| Policy | File | Description |
|--------|------|-------------|
| `ConfirmationThresholdPolicy` | [`domain/policies/confirmation-threshold.policy.ts`](../../src/modules/blockchain-monitor/domain/policies/confirmation-threshold.policy.ts) | Determines if a transaction has sufficient confirmations (default: 6) |
| `ReorgTolerancePolicy` | [`domain/policies/reorg-tolerance.policy.ts`](../../src/modules/blockchain-monitor/domain/policies/reorg-tolerance.policy.ts) | Determines how many blocks of reorganization to tolerate |

---

## Application Layer

### Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `IngestBlockchainEventUseCase` | [`application/use-cases/ingest-blockchain-event.usecase.ts`](../../src/modules/blockchain-monitor/application/use-cases/ingest-blockchain-event.usecase.ts) | Processes a raw blockchain event from the source adapter |
| `ConfirmDepositUseCase` | [`application/use-cases/confirm-deposit.usecase.ts`](../../src/modules/blockchain-monitor/application/use-cases/confirm-deposit.usecase.ts) | Advances confirmation state and publishes `DEPOSIT_CONFIRMED` when threshold is met |
| `GetTransactionStatusUseCase` | [`application/use-cases/get-transaction-status.usecase.ts`](../../src/modules/blockchain-monitor/application/use-cases/get-transaction-status.usecase.ts) | Returns current status of a tracked transaction |
| `ReconcileObservedTransactionsUseCase` | [`application/use-cases/reconcile-observed-transactions.usecase.ts`](../../src/modules/blockchain-monitor/application/use-cases/reconcile-observed-transactions.usecase.ts) | Reconciles tracked transactions against blockchain state |

**Idempotency:** `ConfirmDepositUseCase` is guarded by `IdempotencyGuard` with key `confirm-deposit:{txId}:{confirmations}`.

### Ports

| Port | File |
|------|------|
| `BlockchainSourcePort` | [`application/ports/blockchain-source.port.ts`](../../src/modules/blockchain-monitor/application/ports/blockchain-source.port.ts) |
| `ObservedTransactionRepositoryPort` | [`application/ports/observed-transaction-repository.port.ts`](../../src/modules/blockchain-monitor/application/ports/observed-transaction-repository.port.ts) |
| `EventPublisherPort` | [`application/ports/event-publisher.port.ts`](../../src/modules/blockchain-monitor/application/ports/event-publisher.port.ts) |
| `ClockPort` | [`application/ports/clock.port.ts`](../../src/modules/blockchain-monitor/application/ports/clock.port.ts) |

### DTOs

| DTO | File |
|-----|------|
| `BlockchainEventDto` | [`application/dtos/blockchain-event.dto.ts`](../../src/modules/blockchain-monitor/application/dtos/blockchain-event.dto.ts) |
| `DepositConfirmationDto` | [`application/dtos/deposit-confirmation.dto.ts`](../../src/modules/blockchain-monitor/application/dtos/deposit-confirmation.dto.ts) |
| `TransactionStatusDto` | [`application/dtos/transaction-status.dto.ts`](../../src/modules/blockchain-monitor/application/dtos/transaction-status.dto.ts) |

---

## Infrastructure Layer

| Adapter | File | Description |
|---------|------|-------------|
| `BlockchainEventNormalizerAdapter` | [`infra/adapters/blockchain-event-normalizer.adapter.ts`](../../src/modules/blockchain-monitor/infra/adapters/blockchain-event-normalizer.adapter.ts) | Normalizes external blockchain webhook payloads to domain events |
| `MockBlockchainSourceAdapter` | [`infra/adapters/mock-blockchain-source.adapter.ts`](../../src/modules/blockchain-monitor/infra/adapters/mock-blockchain-source.adapter.ts) | Test double for blockchain source |
| `ObservedTransactionRepository` | [`infra/repositories/observed-transaction.repository.ts`](../../src/modules/blockchain-monitor/infra/repositories/observed-transaction.repository.ts) | In-memory transaction persistence |
| `ObservedTransactionMapper` | [`infra/mappers/observed-transaction.mapper.ts`](../../src/modules/blockchain-monitor/infra/mappers/observed-transaction.mapper.ts) | Domain ↔ persistence mapping |

---

## Events Published

| Event | Trigger | Key Fields |
|-------|---------|-----------|
| `DEPOSIT_DETECTED` | Transaction seen for first time | `txId`, `address`, `amount`, `blockHeight` |
| `DEPOSIT_CONFIRMED` | Confirmation count reaches threshold | `txId`, `confirmations` |
| `TRANSACTION_REORG_DETECTED` | Chain reorganization detected | `txId`, `previousBlock`, `newBlock` |

---

## Tests

| Test File | Description |
|-----------|-------------|
| [`__tests__/blockchain-event-normalizer.test.ts`](../../src/modules/blockchain-monitor/__tests__/blockchain-event-normalizer.test.ts) | Unit tests for event normalizer adapter |
| [`__tests__/confirm-deposit.usecase.test.ts`](../../src/modules/blockchain-monitor/__tests__/confirm-deposit.usecase.test.ts) | Unit tests for deposit confirmation use case |

---

## Operational Notes

- **Confirmation threshold** is configurable via `CONFIRMATION_THRESHOLD` env var (default: 6). Lower values speed processing but increase reorg risk.
- **Chain reorganizations** are detected when a transaction's block height changes. The `ReorgTolerancePolicy` determines how many blocks of reorg to tolerate before raising an alert.
- **Idempotency** on `ConfirmDepositUseCase` ensures a deposit confirmation event is processed at most once per `(txId, confirmationCount)` pair.
- In production, replace `MockBlockchainSourceAdapter` with a real Bitcoin node webhook receiver or a block explorer API adapter.
