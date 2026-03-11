# ADR-004: Idempotency Policy for Command Processing

## Status

Accepted

## Context

In an event-driven system with retries, the same command or event handler may be invoked more than once. This can happen due to:

- `OutboxProcessor` retrying a message publish after a transient failure
- `ResilientEventBus` retrying an event handler after an error
- Network timeouts causing duplicate HTTP requests
- Process restarts replaying events from the outbox

Without protection, duplicate invocations can cause:
- Multiple liquidity allocations for the same deposit
- Multiple payments scheduled for the same destination
- Inconsistent financial state

## Decision

We implement an **idempotency policy** using `IdempotencyGuard` ([`shared/policies/idempotency-policy.ts`](../../src/shared/policies/idempotency-policy.ts)):

1. Critical use cases wrap their execution in `idempotencyGuard.executeOnce(key, operation)`
2. On first invocation: the operation executes and the result is stored in `IdempotencyStore` with a TTL (default: 3600 seconds)
3. On subsequent invocations with the same key: the cached result is returned without re-executing the operation

**Idempotency keys are designed to be deterministic** — the same logical operation always produces the same key:

| Use Case | Key Format |
|----------|-----------|
| `ConfirmDepositUseCase` | `confirm-deposit:{txId}:{confirmations}` |
| `AllocateLiquidityUseCase` | `allocate:{allocationId}` |
| `SchedulePaymentUseCase` | `schedule:{destination}:{amount}:{delay}` |
| `MarkPaymentExecutedUseCase` | `execute-payment:{paymentId}` |

**Source:** [`shared/policies/idempotency-policy.ts`](../../src/shared/policies/idempotency-policy.ts) · [`infra/persistence/idempotency.store.ts`](../../src/infra/persistence/idempotency.store.ts)

## Consequences

**Benefits:**
- Duplicate event deliveries are safe — they hit the idempotency cache and return without side effects
- Retries are safe at the use case level, not just the event bus level
- The idempotency store provides an audit trail of processed operations

**Trade-offs:**
- TTL-based expiry means records eventually expire. If a duplicate arrives after TTL, it may re-execute. Default TTL (3600s) is appropriate for most scenarios; adjust per use case if needed
- The idempotency key must be chosen carefully — if the key is too broad, different operations may collide; too narrow, and duplicates slip through
- The current `InMemoryIdempotencyStore` does not survive restarts. After a restart, previously processed operations may re-execute if their events are replayed

## Alternatives Considered

**Database unique constraints:** Use a unique constraint on the operation key at the database level. Provides atomicity guarantees. Requires Supabase schema design — the current in-memory approach is a stepping stone.

**Application-level flag on aggregate:** Mark the aggregate as "processed" after first execution. Simpler but requires domain model changes for each new idempotency requirement. Less reusable.

**Request-level idempotency keys (Stripe-style):** Clients provide an idempotency key in the request. Valid for HTTP API endpoints but does not help for event-driven handlers.
