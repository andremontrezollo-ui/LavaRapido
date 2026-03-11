# Module: deposit-saga

> **Source:** [`backend/src/modules/deposit-saga/`](../../src/modules/deposit-saga/)  
> **Related:** [System Overview](../system-overview.md) · [Architecture](../architecture.md) · [Diagrams — Saga Flow](../diagrams/saga-flow.mmd)

---

## Purpose

The `deposit-saga` module orchestrates the full deposit processing flow as a three-step saga: confirm deposit → reserve liquidity → schedule payments. It uses the `SagaOrchestrator` infrastructure to manage state transitions and coordinate compensation in case of partial failures.

---

## Saga Definition

**Source:** [`deposit-processing.saga.ts`](../../src/modules/deposit-saga/deposit-processing.saga.ts)

The saga is defined as a factory function `createDepositSagaSteps` that accepts a context object and a dependencies object, and returns an array of `SagaStep` objects for the `SagaOrchestrator` to execute.

### Context

```typescript
interface DepositSagaContext {
  txId: string;            // Bitcoin transaction ID being processed
  amount: number;          // Total deposit amount (BTC)
  destinations: string[];  // Output addresses (one payment per destination)
  poolId: string;          // Liquidity pool to use
  correlationId: string;   // Trace ID propagated through all steps
}
```

### Dependencies

```typescript
interface DepositSagaDependencies {
  confirmDeposit: (txId: string) => Promise<void>;
  reserveLiquidity: (poolId: string, amount: number) => Promise<string>;  // returns allocationId
  schedulPayment: (destination: string, amount: number, delaySeconds: number) => Promise<string>;
  releaseLiquidity: (poolId: string, allocationId: string) => Promise<void>;
  markDepositUnprocessed: (txId: string) => Promise<void>;
  logger: Logger;
}
```

---

## Saga Steps

### Step 1: `confirm_deposit`

| Attribute | Value |
|-----------|-------|
| **Execute** | Calls `deps.confirmDeposit(ctx.txId)` — delegates to `blockchain-monitor` use case |
| **Compensate** | Calls `deps.markDepositUnprocessed(ctx.txId)` — marks the deposit as unprocessed |
| **Failure** | Triggers compensation for all completed steps (none before this step) |

### Step 2: `reserve_liquidity`

| Attribute | Value |
|-----------|-------|
| **Execute** | Calls `deps.reserveLiquidity(ctx.poolId, ctx.amount)` — reserves funds in `liquidity-pool` |
| **Compensate** | If `allocationId` is set, calls `deps.releaseLiquidity(ctx.poolId, allocationId)` |
| **Failure** | Triggers compensation for Step 1 (`markDepositUnprocessed`) |

### Step 3: `schedule_payments`

| Attribute | Value |
|-----------|-------|
| **Execute** | For each destination, calls `deps.schedulPayment(dest, perDestinationAmount, jitter)` where `jitter = random(60, 360)` |
| **Compensate** | No-op — scheduled payments in `SCHEDULED` state will expire without execution |
| **Failure** | Triggers compensation for Steps 2 and 1 |

**Amount distribution:**  
`perDestinationAmount = ctx.amount / ctx.destinations.length`

---

## State Machine

```
                  ┌──────────────┐
                  │   started    │
                  └──────┬───────┘
                         │
              ┌──────────▼──────────┐
              │  confirm_deposit     │
              └──────────┬──────────┘
                 success │           failure ──→ (no compensation)
              ┌──────────▼──────────┐              │
              │ reserve_liquidity   │              ▼
              └──────────┬──────────┘        compensated
                 success │           failure ──→ compensate confirm_deposit
              ┌──────────▼──────────┐
              │  schedule_payments  │
              └──────────┬──────────┘
                 success │           failure ──→ compensate reserve_liquidity
              ┌──────────▼──────────┐              └→ compensate confirm_deposit
              │     completed       │
              └─────────────────────┘
```

For a visual diagram, see [`diagrams/saga-flow.mmd`](../diagrams/saga-flow.mmd).

---

## Infrastructure

The saga is executed by `SagaOrchestrator` in [`infra/saga/saga-orchestrator.ts`](../../src/infra/saga/saga-orchestrator.ts):

```typescript
await orchestrator.execute('deposit-processing', createDepositSagaSteps(ctx, deps));
```

Saga state is persisted in `SagaStore` ([`infra/saga/saga.store.ts`](../../src/infra/saga/saga.store.ts)).

### Saga States

| State | Description |
|-------|-------------|
| `started` | Saga has been initiated |
| `step_completed` | A step has completed successfully |
| `completed` | All steps completed; saga finished |
| `compensating` | A step failed; running compensation in reverse |
| `compensated` | All compensations completed |
| `failed` | Compensation itself failed; requires manual intervention |

---

## Triggering the Saga

The saga is triggered when the system receives a `DEPOSIT_CONFIRMED` event. The event handler:

1. Constructs a `DepositSagaContext` from the event payload
2. Resolves `DepositSagaDependencies` by binding use case methods
3. Calls `SagaOrchestrator.execute('deposit-processing', steps)`

---

## Compensation Behavior

| Failed Step | Compensation Actions |
|-------------|---------------------|
| `confirm_deposit` | None (was the first step) |
| `reserve_liquidity` | `markDepositUnprocessed(txId)` |
| `schedule_payments` | `releaseLiquidity(poolId, allocationId)` then `markDepositUnprocessed(txId)` |

---

## Operational Notes

- **Compensation failures** cause the saga to transition to `failed` state. This requires manual intervention. Monitor for sagas stuck in `compensating` state for > 5 minutes.
- **Correlation tracking:** The `correlationId` is propagated to all saga steps, enabling full trace from `DEPOSIT_CONFIRMED` through every downstream operation.
- **Idempotency:** Each step delegates to use cases that are individually idempotency-guarded. Re-running a saga will not re-execute completed steps.
- **Single-pass design:** The current saga implementation does not resume from a checkpoint after a restart. If the process restarts during saga execution, the saga is lost (in-memory `SagaStore`). Migrating `SagaStore` to Supabase will enable restart recovery.
- **Payment amount distribution:** The deposit amount is split equally across all destinations. Future versions may implement weighted or proportional distribution.
