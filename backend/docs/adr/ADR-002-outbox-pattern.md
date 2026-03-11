# ADR-002: Outbox Pattern for Durable Event Publishing

## Status

Accepted

## Context

In an event-driven system, a critical reliability problem arises: a module may update its aggregate (e.g., mark a deposit as confirmed) and then attempt to publish an event. If the process crashes between these two operations, the aggregate update is persisted but the event is never published — causing downstream modules to miss the event and leaving the system in an inconsistent state.

Publishing the event first has the same problem in reverse: the event is published but the aggregate update fails.

## Decision

We implement the **Outbox Pattern**:

1. The application layer writes both the aggregate update and an outbox message in a single logical operation
2. The outbox message is initially marked as `pending` in `OutboxStore`
3. A background `OutboxProcessor` ([`infra/messaging/outbox-processor.ts`](../../src/infra/messaging/outbox-processor.ts)) polls for pending messages and publishes them via `EventBus`
4. Successfully published messages are marked as `published`; failed messages are retried (up to 5 times) before moving to `dead_letter`

```
write aggregate + write outbox_message (atomic)
    ↓
OutboxProcessor polls (every OUTBOX_POLL_INTERVAL_MS)
    ↓
publish to EventBus
    ↓
mark as published
```

**Source:** [`shared/events/outbox-message.ts`](../../src/shared/events/outbox-message.ts) · [`infra/persistence/outbox.store.ts`](../../src/infra/persistence/outbox.store.ts) · [`infra/messaging/outbox-processor.ts`](../../src/infra/messaging/outbox-processor.ts)

## Consequences

**Benefits:**
- Events are guaranteed to eventually be published, even after process crashes (when backed by durable storage)
- The event payload is stored — enabling replay and audit
- The `OutboxProcessor` can retry failed publishes without losing the original event
- Events can be inspected in the outbox table for debugging

**Trade-offs:**
- There is a delivery delay equal to the polling interval (`OUTBOX_POLL_INTERVAL_MS`, default configurable)
- The outbox store must be durable (backed by Supabase) for the guarantee to hold — the current in-memory implementation does not survive restarts
- The outbox processor is a background goroutine that adds complexity

## Alternatives Considered

**Direct publish + compensating logic:** Publish first, update aggregate second. If aggregate update fails, emit a compensating event. Complex to implement correctly; does not handle crashes between the two operations.

**Two-phase commit:** Atomic writes across event store and aggregate store. Not supported by the current Supabase setup without distributed transaction support.

**Change Data Capture (CDC):** Listen to database change stream and publish events from there. Elegant but requires database-level streaming support (Supabase Realtime or pg_logical replication). Could be a future migration path.

**Transactional event store:** Append events directly to an immutable event store (event sourcing). Architecturally clean but requires rebuilding the domain model on top of event sourcing, which is a significant refactor.
