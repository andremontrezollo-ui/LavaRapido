# ADR-001: Event-Driven Architecture with ResilientEventBus

## Status

Accepted

## Context

LavaRapido orchestrates a multi-step process: detect on-chain deposits → allocate liquidity → schedule payments. These three operations span three independent modules (`blockchain-monitor`, `liquidity-pool`, `payment-scheduler`), each with its own domain model and lifecycle.

A synchronous call chain (A calls B calls C) would tightly couple these modules, making them dependent on each other's availability, latency, and error handling. This would also make it harder to evolve each module independently and add future steps to the flow.

The system also needs to handle partial failures gracefully: if payment scheduling fails, the already-allocated liquidity must be released. This requires coordination logic that should not live inside any single module.

## Decision

We adopt an **event-driven architecture** where:

1. Each module publishes domain events when significant things happen (`DEPOSIT_CONFIRMED`, `LIQUIDITY_ALLOCATED`, `PAYMENT_EXECUTED`)
2. Modules subscribe to events published by other modules — never calling each other directly
3. All inter-module communication flows through a shared `EventBus` interface
4. The `ResilientEventBus` ([`shared/events/InMemoryEventBus.ts`](../../src/shared/events/InMemoryEventBus.ts)) provides reliability guarantees: retry with exponential backoff, deduplication via `InboxStore`, and dead letter queue for permanently failed events

The `SystemEvent` union type in [`shared/events/DomainEvent.ts`](../../src/shared/events/DomainEvent.ts) defines all known event types, providing compile-time safety.

## Consequences

**Benefits:**
- Modules are fully decoupled — `liquidity-pool` has no import from `blockchain-monitor`
- New steps can be added to the flow without modifying existing modules
- Retry and deduplication are handled centrally, not in each module
- `correlationId` is propagated through all events, enabling end-to-end tracing
- The event log (Outbox) provides an audit trail of all significant system events

**Trade-offs:**
- Debugging is harder — a single operation spans multiple event handlers
- Testing requires event bus test doubles
- The current `ResilientEventBus` is in-memory; production requires a durable event store or message broker
- Event ordering is not guaranteed across different event types

## Alternatives Considered

**Direct module calls (synchronous):** Simpler for testing, but creates tight coupling. Changes to one module's interface require changes in calling modules. Partial failures require complex rollback logic at the call site.

**Message broker (Kafka, RabbitMQ):** Provides durability, ordering, and horizontal scaling. Currently out of scope for the target deployment (serverless edge function). The Outbox pattern bridges the gap until a message broker is needed.

**GraphQL subscriptions / WebSocket events:** Not appropriate for server-side module-to-module coordination.
