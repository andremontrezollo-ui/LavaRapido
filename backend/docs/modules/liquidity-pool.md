# Module: liquidity-pool

> **Source:** [`backend/src/modules/liquidity-pool/`](../../src/modules/liquidity-pool/)  
> **Related:** [System Overview](../system-overview.md) · [Architecture](../architecture.md)

---

## Purpose

The `liquidity-pool` module manages a Bitcoin liquidity reserve. It credits the pool when deposits are confirmed, allocates liquidity for outgoing payments, tracks financial obligations, and emits pool health warnings when utilization exceeds configured thresholds.

---

## Domain Model

### Entities

| Entity | File | Description |
|--------|------|-------------|
| `LiquidityPool` | [`domain/entities/liquidity-pool.entity.ts`](../../src/modules/liquidity-pool/domain/entities/liquidity-pool.entity.ts) | The pool aggregate — tracks total balance and allocated amounts |
| `Obligation` | [`domain/entities/obligation.entity.ts`](../../src/modules/liquidity-pool/domain/entities/obligation.entity.ts) | A reserved amount pending payment execution |
| `Allocation` | [`domain/entities/allocation.entity.ts`](../../src/modules/liquidity-pool/domain/entities/allocation.entity.ts) | A confirmed allocation of funds from the pool |
| `ReserveBalance` | [`domain/entities/reserve-balance.entity.ts`](../../src/modules/liquidity-pool/domain/entities/reserve-balance.entity.ts) | Current available balance after subtracting obligations |

### Value Objects

| Value Object | File | Description |
|-------------|------|-------------|
| `Amount` | [`domain/value-objects/amount.vo.ts`](../../src/modules/liquidity-pool/domain/value-objects/amount.vo.ts) | Non-negative BTC amount (satoshi precision) |
| `ObligationId` | [`domain/value-objects/obligation-id.vo.ts`](../../src/modules/liquidity-pool/domain/value-objects/obligation-id.vo.ts) | Unique identifier for an obligation |
| `ReserveId` | [`domain/value-objects/reserve-id.vo.ts`](../../src/modules/liquidity-pool/domain/value-objects/reserve-id.vo.ts) | Unique identifier for a reserve entry |

### Domain Events

| Event | File | Description |
|-------|------|-------------|
| `LIQUIDITY_ALLOCATED` | [`domain/events/liquidity-allocated.event.ts`](../../src/modules/liquidity-pool/domain/events/liquidity-allocated.event.ts) | Funds allocated for a payment |
| `OBLIGATION_RESERVED` | [`domain/events/obligation-reserved.event.ts`](../../src/modules/liquidity-pool/domain/events/obligation-reserved.event.ts) | An obligation was reserved against the pool |
| `POOL_HEALTH_WARNING` | [`domain/events/pool-health-warning.event.ts`](../../src/modules/liquidity-pool/domain/events/pool-health-warning.event.ts) | Pool utilization exceeded a warning threshold |
| `POOL_REBALANCED` | [`domain/events/pool-rebalanced.event.ts`](../../src/modules/liquidity-pool/domain/events/pool-rebalanced.event.ts) | Pool balance was rebalanced |

### Domain Errors

| Error | File |
|-------|------|
| `InsufficientLiquidityError` | [`domain/errors/insufficient-liquidity.error.ts`](../../src/modules/liquidity-pool/domain/errors/insufficient-liquidity.error.ts) |
| `InvalidAllocationError` | [`domain/errors/invalid-allocation.error.ts`](../../src/modules/liquidity-pool/domain/errors/invalid-allocation.error.ts) |
| `InconsistentReserveStateError` | [`domain/errors/inconsistent-reserve-state.error.ts`](../../src/modules/liquidity-pool/domain/errors/inconsistent-reserve-state.error.ts) |

### Policies

| Policy | File | Description |
|--------|------|-------------|
| `AllocationPolicy` | [`domain/policies/allocation-policy.ts`](../../src/modules/liquidity-pool/domain/policies/allocation-policy.ts) | Validates whether an allocation can be fulfilled |
| `PoolHealthPolicy` | [`domain/policies/pool-health.policy.ts`](../../src/modules/liquidity-pool/domain/policies/pool-health.policy.ts) | Determines pool health based on utilization rate |
| `ReserveThresholdPolicy` | [`domain/policies/reserve-threshold.policy.ts`](../../src/modules/liquidity-pool/domain/policies/reserve-threshold.policy.ts) | Sets reserve level thresholds triggering warnings |

---

## Application Layer

### Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `AllocateLiquidityUseCase` | [`application/use-cases/allocate-liquidity.usecase.ts`](../../src/modules/liquidity-pool/application/use-cases/allocate-liquidity.usecase.ts) | Allocates funds from the pool for a payment |
| `RegisterDepositCreditUseCase` | [`application/use-cases/register-deposit-credit.usecase.ts`](../../src/modules/liquidity-pool/application/use-cases/register-deposit-credit.usecase.ts) | Credits the pool when a deposit is confirmed |
| `ReserveObligationUseCase` | [`application/use-cases/reserve-obligation.usecase.ts`](../../src/modules/liquidity-pool/application/use-cases/reserve-obligation.usecase.ts) | Reserves a financial obligation against the pool |
| `ReleaseObligationUseCase` | [`application/use-cases/release-obligation.usecase.ts`](../../src/modules/liquidity-pool/application/use-cases/release-obligation.usecase.ts) | Releases a previously reserved obligation (compensation) |
| `RebalancePoolUseCase` | [`application/use-cases/rebalance-pool.usecase.ts`](../../src/modules/liquidity-pool/application/use-cases/rebalance-pool.usecase.ts) | Triggers a pool rebalance operation |
| `GetPoolHealthUseCase` | [`application/use-cases/get-pool-health.usecase.ts`](../../src/modules/liquidity-pool/application/use-cases/get-pool-health.usecase.ts) | Returns current pool health status |

**Idempotency:** `AllocateLiquidityUseCase` is guarded by `IdempotencyGuard` with key `allocate:{allocationId}`.

### Ports

| Port | File |
|------|------|
| `LiquidityPoolRepositoryPort` | [`application/ports/liquidity-pool-repository.port.ts`](../../src/modules/liquidity-pool/application/ports/liquidity-pool-repository.port.ts) |
| `ObligationRepositoryPort` | [`application/ports/obligation-repository.port.ts`](../../src/modules/liquidity-pool/application/ports/obligation-repository.port.ts) |
| `EventPublisherPort` | [`application/ports/event-publisher.port.ts`](../../src/modules/liquidity-pool/application/ports/event-publisher.port.ts) |
| `ClockPort` | [`application/ports/clock.port.ts`](../../src/modules/liquidity-pool/application/ports/clock.port.ts) |

### DTOs

| DTO | File |
|-----|------|
| `DepositCreditDto` | [`application/dtos/deposit-credit.dto.ts`](../../src/modules/liquidity-pool/application/dtos/deposit-credit.dto.ts) |
| `LiquidityAllocationDto` | [`application/dtos/liquidity-allocation.dto.ts`](../../src/modules/liquidity-pool/application/dtos/liquidity-allocation.dto.ts) |
| `ObligationDto` | [`application/dtos/obligation.dto.ts`](../../src/modules/liquidity-pool/application/dtos/obligation.dto.ts) |
| `PoolHealthDto` | [`application/dtos/pool-health.dto.ts`](../../src/modules/liquidity-pool/application/dtos/pool-health.dto.ts) |

---

## Infrastructure Layer

| Adapter | File | Description |
|---------|------|-------------|
| `MockPoolBalanceAdapter` | [`infra/adapters/mock-pool-balance.adapter.ts`](../../src/modules/liquidity-pool/infra/adapters/mock-pool-balance.adapter.ts) | Test double for pool balance |
| `LiquidityPoolRepository` | [`infra/repositories/liquidity-pool.repository.ts`](../../src/modules/liquidity-pool/infra/repositories/liquidity-pool.repository.ts) | In-memory pool persistence |
| `ObligationRepository` | [`infra/repositories/obligation.repository.ts`](../../src/modules/liquidity-pool/infra/repositories/obligation.repository.ts) | In-memory obligation persistence |

---

## Events Published

| Event | Trigger | Key Fields |
|-------|---------|-----------|
| `LIQUIDITY_ALLOCATED` | `AllocateLiquidityUseCase` succeeds | `allocationId`, `amount`, `poolId` |
| `OBLIGATION_RESERVED` | `ReserveObligationUseCase` succeeds | `obligationId`, `amount` |
| `POOL_HEALTH_WARNING` | Utilization exceeds threshold | `poolId`, `status`, `utilizationRate` |
| `POOL_REBALANCED` | `RebalancePoolUseCase` completes | `poolId`, `previousBalance`, `newBalance` |

---

## Events Consumed

| Event | Source Module | Action |
|-------|-------------|--------|
| `DEPOSIT_CONFIRMED` | `blockchain-monitor` | Triggers `RegisterDepositCreditUseCase` to credit the pool |

---

## Tests

| Test File | Description |
|-----------|-------------|
| [`__tests__/allocate-liquidity.usecase.test.ts`](../../src/modules/liquidity-pool/__tests__/allocate-liquidity.usecase.test.ts) | Unit tests for allocation use case |
| [`__tests__/pool-health.policy.test.ts`](../../src/modules/liquidity-pool/__tests__/pool-health.policy.test.ts) | Unit tests for pool health policy |

---

## Operational Notes

- **Insufficient liquidity** causes `AllocateLiquidityUseCase` to throw `InsufficientLiquidityError` and the saga to enter compensation mode — releasing any previously reserved obligations.
- **Pool health warnings** are emitted when `utilizationRate` exceeds the threshold defined in `ReserveThresholdPolicy`. Monitor `POOL_HEALTH_WARNING` events and alert on sustained high utilization.
- **Obligation release** (saga compensation) is the rollback mechanism when payment scheduling fails. The `ReleaseObligationUseCase` is called by the saga compensate step for `reserve_liquidity`.
- In production, the pool balance should be backed by Supabase for persistence across restarts.
