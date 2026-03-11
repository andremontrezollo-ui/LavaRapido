# ADR-003: Saga Orchestration for Deposit Processing

## Status

Accepted

## Context

The deposit processing flow spans three modules: `blockchain-monitor` (confirm deposit), `liquidity-pool` (reserve liquidity), and `payment-scheduler` (schedule payment). This is a classic distributed transaction problem: all three steps must succeed, or the system must roll back to a consistent state.

Two approaches exist for coordinating multi-step workflows: **choreography** (each module reacts to events and emits its own, forming a chain) and **orchestration** (a central coordinator drives the process).

In choreography, the compensation logic is distributed across modules. If payment scheduling fails after liquidity allocation, who is responsible for releasing the liquidity? The `payment-scheduler` module would need to know about `liquidity-pool` internals.

## Decision

We use **Saga Orchestration** via `SagaOrchestrator` ([`infra/saga/saga-orchestrator.ts`](../../src/infra/saga/saga-orchestrator.ts)):

1. A central `DepositSaga` ([`modules/deposit-saga/deposit-processing.saga.ts`](../../src/modules/deposit-saga/deposit-processing.saga.ts)) defines all steps and their compensation actions
2. The `SagaOrchestrator` executes steps sequentially and, on failure, compensates completed steps in reverse order
3. Each step is a thin wrapper around use cases in the respective module
4. Saga state is persisted in `SagaStore` for durability

**Saga steps:**
```
Step 1: confirm_deposit     → compensate: markDepositUnprocessed
Step 2: reserve_liquidity   → compensate: releaseLiquidity
Step 3: schedule_payments   → compensate: (no-op)
```

## Consequences

**Benefits:**
- Compensation logic is centralized and explicit — easy to reason about
- The saga state machine provides visibility into progress (`started`, `step_completed`, `completed`, `compensating`, `compensated`, `failed`)
- Modules remain decoupled from each other — they only expose use case interfaces
- `correlationId` is propagated through all saga steps for end-to-end tracing

**Trade-offs:**
- A central `deposit-saga` module has knowledge of all three module use cases — it is intentionally a coordination layer
- The saga orchestrator must be available for the duration of the saga (not an issue for single-process deployment)
- If the process crashes during saga execution, the in-memory saga state is lost. Migrating `SagaStore` to Supabase will enable recovery
- Compensation is "best effort" — if compensation itself fails, the saga enters `failed` state requiring manual intervention

## Alternatives Considered

**Choreography:** Each module subscribes to events and emits its own. `liquidity-pool` subscribes to `DEPOSIT_CONFIRMED`; `payment-scheduler` subscribes to `LIQUIDITY_ALLOCATED`. Compensation would require each module to subscribe to failure events from downstream modules. This distributes compensation logic and makes the flow harder to reason about. Chosen against for this use case.

**Two-phase commit:** Not viable without distributed transaction support in the infrastructure.

**Process Manager Pattern:** Similar to orchestration but more stateful, tracking state in a long-lived process manager. The `SagaOrchestrator` effectively implements this pattern with the `SagaState` object.
