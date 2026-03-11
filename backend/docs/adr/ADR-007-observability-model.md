# ADR-007: Observability Model with Correlation ID Propagation

## Status

Accepted

## Context

LavaRapido processes requests that span multiple modules, event handlers, saga steps, and background jobs. A single deposit triggers a chain of operations: HTTP request → use case → domain event → event handler → liquidity allocation → payment scheduling → job execution.

When something goes wrong, operators need to trace the entire chain from the triggering event through all downstream effects. Without a shared trace identifier, correlating log entries across components requires timestamp guessing and is unreliable.

## Decision

We implement a **correlation ID-based observability model**:

1. Every inbound HTTP request is assigned a `correlationId` — either from the `X-Correlation-ID` header or auto-generated as a UUID ([`api/middlewares/correlation-id.middleware.ts`](../../src/api/middlewares/correlation-id.middleware.ts))
2. The `correlationId` is passed to every `SecureLogger` instance as a base field — it appears in every log line emitted during request processing
3. The `correlationId` is embedded in every domain event via the `correlationId` field on `DomainEvent`
4. Event handlers propagate the `correlationId` from the triggering event to their own log calls and child events
5. Saga steps receive the `correlationId` from `DepositSagaContext` and log it in every step
6. The `correlationId` is returned in the `X-Correlation-ID` response header

This allows a single `correlationId` to trace: HTTP request → use case → outbox message → event bus dispatch → handler execution → saga step → child event → job execution.

**Source:** [`api/middlewares/correlation-id.middleware.ts`](../../src/api/middlewares/correlation-id.middleware.ts) · [`shared/events/DomainEvent.ts`](../../src/shared/events/DomainEvent.ts) · [`shared/logging/logger.ts`](../../src/shared/logging/logger.ts)

## Consequences

**Benefits:**
- End-to-end tracing of any operation using a single ID
- Log queries are simple: `select * from logs where correlationId = '<id>'`
- The `causationId` field on `DomainEvent` provides parent-child event relationships (event sourcing-style)
- Structured logging (NDJSON) makes correlation ID queries trivial in any log aggregation tool

**Trade-offs:**
- Correlation IDs must be explicitly propagated at every boundary — missing one breaks the trace chain
- Background jobs and periodic operations (outbox processor, job scheduler) may not have a request-originating `correlationId`; they use a generated ID per run
- The model provides tracing but not distributed tracing (spans with timing, parent-child relationships, latency attribution). OpenTelemetry integration would provide this.

## Current Observability State

| Pillar | Status | Gap |
|--------|--------|-----|
| Structured logging | ✅ Implemented | - |
| Correlation ID propagation | ✅ Implemented | Background job propagation |
| Metrics | ❌ Not implemented | Need Prometheus/StatsD instrumentation |
| Distributed tracing | ❌ Not implemented | Need OpenTelemetry SDK |
| Alerting | ❌ Not implemented | Need alert rules on metrics |

## Alternatives Considered

**OpenTelemetry from day one:** Provides richer tracing (spans, timing, parent-child, sampling). Higher implementation cost. Chosen to defer until the observability model is validated with simpler correlation IDs first.

**Request ID only (no correlation through events):** Each HTTP request gets an ID, but events don't carry it. Events would be untraceable back to their originating request. Insufficient for debugging.

**Distributed trace context (W3C TraceContext):** Would enable cross-service tracing if multiple services are involved. Current architecture is a single service; defer until microservice boundary is introduced.
