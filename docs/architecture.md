# ShadowMix — Architecture Document

## Overview

ShadowMix follows **Clean Architecture + Domain-Driven Design (DDD)** with strict module boundaries and event-driven inter-module communication.

## Module Diagram

```
┌────────────────────────────────────────────────────────┐
│                      API Layer                         │
│  (Edge Functions: mix-sessions, contact, health, etc.) │
└───────────────┬───────────────────────┬────────────────┘
                │                       │
       ┌────────▼────────┐     ┌────────▼────────┐
       │  Application    │     │  Application    │
       │  (Use Cases)    │     │  (Use Cases)    │
       └────────┬────────┘     └────────┬────────┘
                │                       │
       ┌────────▼────────┐     ┌────────▼────────┐
       │  Domain          │     │  Domain          │
       │  (Entities,      │     │  (Entities,      │
       │   Value Objects, │     │   Value Objects, │
       │   Policies,      │     │   Policies,      │
       │   Events)        │     │   Events)        │
       └─────────────────┘     └─────────────────┘
                │                       │
       ┌────────▼───────────────────────▼────────┐
       │              Shared Kernel               │
       │  (DomainEvent, EventBus, ErrorResponse,  │
       │   Ports, Policies base, Result types)    │
       └──────────────────┬──────────────────────┘
                          │
       ┌──────────────────▼──────────────────────┐
       │           Infrastructure                 │
       │  (EventBus impl, Logger, KV Store,       │
       │   Security Headers, Metrics)             │
       └─────────────────────────────────────────┘
```

## Modules

| Module | Responsibility |
|--------|---------------|
| **address-generator** | Sandbox of identities: unique, non-reusable tokens per operation |
| **blockchain-monitor** | Observes blockchain state, normalizes events |
| **liquidity-pool** | Structural dissociation layer for fund aggregation |
| **log-minimizer** | Privacy-preserving logging with data classification and retention |
| **payment-scheduler** | Scheduling policies, time windows, batch management |

## Inter-Module Communication

Modules **never** import directly from each other. Communication flows through the **EventBus**:

```
address-generator ──► EventBus ──► blockchain-monitor
                                   liquidity-pool
                                   payment-scheduler
                                   log-minimizer
```

### Event Flow Example

1. `address-generator` emits `ADDRESS_TOKEN_EMITTED`
2. `blockchain-monitor` subscribes and watches for deposits
3. On deposit detection, emits `TRANSACTION_CONFIRMED`
4. `liquidity-pool` reserves funds via `LIQUIDITY_RESERVED`
5. `payment-scheduler` plans outputs via `PAYMENT_PLANNED`

## Dependency Rules

```
Domain ──► (nothing external)
Application ──► Domain, Shared Ports
Infrastructure ──► Application (implements ports), Domain
API ──► Application (orchestrates use cases)
```

**Domain MUST NOT depend on Infrastructure.**

## Policy Objects

Complex business rules are encapsulated in policy objects:

| Policy | Location | Purpose |
|--------|----------|---------|
| `AddressExpirationPolicy` | address-generator/domain/policies | TTL per namespace purpose |
| `AddressGenerationPolicy` | address-generator/domain/policies | Max active addresses per network |
| `PoolHealthPolicy` | liquidity-pool/domain/policies | Health evaluation and thresholds |
| `LogRetentionPolicy` | log-minimizer/domain/policies | Data classification and retention |
| `RateLimitPolicy` | payment-scheduler/domain/policies | Rate limit evaluation |

## Edge Functions (Runtime)

| Function | Method | Purpose |
|----------|--------|---------|
| `mix-sessions` | POST | Create mixing session |
| `mix-session-status` | POST | Query session status |
| `contact` | POST | Create support ticket |
| `health` | GET/POST | Health check |
| `cleanup` | POST | Expire sessions, prune rate limits |

## Shared Utilities

All Edge Functions use shared utilities from `_shared/`:
- `security-headers.ts` — Centralized CORS + security headers
- `error-response.ts` — Standardized error format
- `structured-logger.ts` — Privacy-preserving structured logs
- `rate-limiter.ts` — Reusable rate limiting logic
