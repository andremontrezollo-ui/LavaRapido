# ShadowMix — Architecture Document

## Overview

ShadowMix follows **Clean Architecture + Domain-Driven Design (DDD)** with strict module boundaries, event-driven inter-module communication, and a clear separation between **business core** and **HTTP runtime**.

---

## Runtime Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Edge Functions                    │
│  (Deno runtime — thin HTTP adapters only)                   │
│  supabase/functions/{mix-sessions,contact,health,cleanup}   │
└──────────────────────┬──────────────────────────────────────┘
                       │  delegates to
┌──────────────────────▼──────────────────────────────────────┐
│          supabase/functions/_shared/container.ts            │
│  (Supabase-specific adapters implementing backend ports)    │
└──────────────────────┬──────────────────────────────────────┘
                       │  mirrors interfaces from
┌──────────────────────▼──────────────────────────────────────┐
│                  backend/src/modules/                       │
│  (canonical domain logic, use cases, port interfaces)       │
└─────────────────────────────────────────────────────────────┘
```

### Roles

| Layer | Path | Responsibility |
|-------|------|---------------|
| **Edge Functions** | `supabase/functions/*/index.ts` | HTTP routing, CORS, method validation only |
| **Edge Container** | `supabase/functions/_shared/container.ts` | Wire use cases with Supabase Client (Deno) |
| **Backend Core** | `backend/src/modules/` | Domain entities, use cases, port interfaces |
| **Backend Bootstrap** | `backend/src/bootstrap/` | Node.js container (local dev / other runtimes) |
| **API Contracts** | `backend/src/api/contracts/` | Stable HTTP request/response types |
| **Presenters** | `backend/src/api/presenters/` | Map use-case DTOs → HTTP contracts |

---

## Backend Module Diagram

```
┌────────────────────────────────────────────────────────────┐
│                      API Layer                             │
│  backend/src/api/ — contracts, presenters, middlewares     │
└───────────────┬───────────────────────┬────────────────────┘
                │                       │
       ┌────────▼────────┐     ┌────────▼────────┐
       │  Application    │     │  Application    │
       │  (Use Cases)    │     │  (Use Cases)    │
       └────────┬────────┘     └────────┬────────┘
                │                       │
       ┌────────▼────────┐     ┌────────▼────────┐
       │  Domain         │     │  Domain         │
       │  (Entities,     │     │  (Entities,     │
       │   Value Objects,│     │   Value Objects,│
       │   Policies,     │     │   Policies,     │
       │   Events)       │     │   Events)       │
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
       │  (EventBus impl, Logger, Persistence,    │
       │   Security Headers, Scheduler)           │
       └─────────────────────────────────────────┘
```

---

## Modules

### HTTP-Facing Modules (consumed by Edge Functions)

| Module | Path | Use Cases |
|--------|------|-----------|
| **mix-session** | `backend/src/modules/mix-session/` | `CreateMixSession`, `GetMixSessionStatus`, `CleanupExpiredSessions` |
| **contact** | `backend/src/modules/contact/` | `SubmitContactMessage` |
| **health** | `backend/src/modules/health/` | `GetSystemHealth` |

### Internal Processing Modules (event-driven)

| Module | Responsibility |
|--------|---------------|
| **address-generator** | Sandbox of identities: unique, non-reusable tokens per operation |
| **blockchain-monitor** | Observes blockchain state, normalises events |
| **liquidity-pool** | Structural dissociation layer for fund aggregation |
| **log-minimizer** | Privacy-preserving logging with data classification and retention |
| **payment-scheduler** | Scheduling policies, time windows, batch management |

---

## Edge Functions

| Function | Method | Delegates To |
|----------|--------|-------------|
| `mix-sessions` | POST | `container.createMixSession()` |
| `mix-session-status` | POST | `container.getMixSessionStatus()` |
| `cleanup` | POST | `container.cleanupExpiredSessions()` |
| `contact` | POST | `container.submitContactMessage()` |
| `health` | GET/POST | `container.getSystemHealth()` |

Edge Functions contain **no business logic**. They only handle:
1. CORS preflight (`OPTIONS`)
2. HTTP method validation
3. Input parsing and validation (field presence and format)
4. Delegation to a use case via `getContainer()`
5. HTTP response formatting

---

## Shared Utilities (`supabase/functions/_shared/`)

| File | Purpose |
|------|---------|
| `cors.ts` | CORS headers and preflight response |
| `auth.ts` | Auth context extraction (stub — extend for JWT) |
| `request.ts` | JSON parsing, IP extraction, hashing, request ID |
| `response.ts` | Security headers + JSON response builder |
| `errors.ts` | Standardised error codes and response helpers |
| `telemetry.ts` | Privacy-preserving structured logging |
| `bootstrap.ts` | Supabase client singleton |
| `container.ts` | Dependency container (use case wiring) |

---

## Dependency Rules

```
Domain ──► (nothing external)
Application ──► Domain, Shared Ports
Infrastructure ──► Application (implements ports), Domain
API ──► Application (orchestrates use cases)
Edge Functions ──► _shared/container.ts only
```

**Domain MUST NOT depend on Infrastructure.**  
**Edge Functions MUST NOT contain business logic.**

---

## Inter-Module Communication (Internal Modules)

Internal modules **never** import directly from each other. Communication flows through the **EventBus**:

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

---

## Policy Objects

Complex business rules are encapsulated in policy objects:

| Policy | Location | Purpose |
|--------|----------|---------|
| `SessionExpirationPolicy` | mix-session/domain/policies | TTL per session (30 min default) |
| `AddressExpirationPolicy` | address-generator/domain/policies | TTL per namespace purpose |
| `AddressGenerationPolicy` | address-generator/domain/policies | Max active addresses per network |
| `PoolHealthPolicy` | liquidity-pool/domain/policies | Health evaluation and thresholds |
| `LogRetentionPolicy` | log-minimizer/domain/policies | Data classification and retention |
| `RateLimitPolicy` | payment-scheduler/domain/policies | Rate limit evaluation |
