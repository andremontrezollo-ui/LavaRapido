# ADR-006: Distributed Locks for Concurrent Operation Control

## Status

Accepted (process-local implementation; Supabase-backed implementation pending)

## Context

Several operations in LavaRapido must not execute concurrently for the same resource:
- Payment execution: two schedulers must not both execute the same payment
- Job processing: two instances of `SecureJobScheduler` must not both process the same job

Without locking, concurrent execution can cause:
- Double payment execution
- Double liquidity allocation
- Inconsistent aggregate state

These risks exist today even in single-instance deployments (if the process uses async I/O concurrently) and become critical in multi-instance deployments.

## Decision

We define a `DistributedLock` port ([`shared/ports/DistributedLock.ts`](../../src/shared/ports/DistributedLock.ts)) with `acquire(key, ttlSeconds)` and `release(key)` methods.

The current implementation is **process-local**: a simple `Set` of held lock keys in memory ([`infra/locks/distributed-lock.ts`](../../src/infra/locks/distributed-lock.ts)).

**Lock keys:**
- `payment-exec:{paymentId}` — prevents double payment execution
- `job:{jobId}` — prevents double job processing

**TTL:** Locks expire automatically after `LOCK_TTL_SECONDS` (default: 30 seconds) to prevent deadlocks if a holder crashes without releasing.

The `DistributedLock` port is designed to be swapped for a Supabase advisory lock implementation without changing call sites.

**Source:** [`shared/ports/DistributedLock.ts`](../../src/shared/ports/DistributedLock.ts) · [`infra/locks/distributed-lock.ts`](../../src/infra/locks/distributed-lock.ts)

## Consequences

**Benefits:**
- Prevents double-execution within a single process
- `DistributedLock` port abstraction makes it easy to swap to a production implementation
- TTL-based expiry prevents deadlocks from crashed holders
- Lock acquisition failures are logged and the operation is skipped (not retried) — preventing cascading lock contention

**Current limitations:**
- The process-local implementation does not work across multiple instances
- Multi-instance deployments will have no coordination — concurrent execution is possible
- Lock state is lost on restart — locks held at restart time are not cleaned up (they would have expired anyway after TTL)

## Roadmap

For multi-instance deployments, replace the process-local implementation with:

```typescript
// Supabase advisory locks
async acquire(key: string, ttlSeconds: number): Promise<boolean> {
  const { data } = await supabase.rpc('pg_try_advisory_lock', { key: hashKey(key) });
  return data === true;
}

async release(key: string): Promise<void> {
  await supabase.rpc('pg_advisory_unlock', { key: hashKey(key) });
}
```

Or use Redis with `SET key NX EX ttl` for distributed locking.

## Alternatives Considered

**Idempotency only (no locking):** Idempotency prevents duplicate results but does not prevent concurrent execution from starting. Two executions could run in parallel and both check idempotency at the same time — both see "not yet processed" and both proceed.

**Database row locking (`SELECT FOR UPDATE`):** Effective for Supabase-backed repositories. Requires transactions. More complex to implement than advisory locks.

**Optimistic concurrency (version fields):** Update aggregate with version check; fail if version doesn't match expected. Requires retry logic at the call site. Effective for low-contention scenarios.
