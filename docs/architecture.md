# ShadowMix — Architecture Document

## Overview

ShadowMix follows **Clean Architecture + Domain-Driven Design (DDD)** with strict module
boundaries and event-driven inter-module communication.

The **single source of truth for all business logic** is `backend/src/`.
Supabase Edge Functions are **thin HTTP adapters** only — they parse requests, delegate to
use cases, and map errors to HTTP responses.

---

## Request Flow

```
Client Request
    │
    ▼
supabase/functions/<fn>/index.ts   ← HTTP adapter only
    │  parse request, hash IP
    │  inject Deno repository implementations
    ▼
backend/src/modules/<module>/      ← ALL business logic lives here
  application/use-cases/
    │  validate inputs
    │  enforce rate limits
    │  run domain logic
    │  call repository ports
    ▼
supabase/functions/_shared/repositories/  ← Deno/Supabase infra
    │  SQL via Supabase JS client
    ▼
Supabase PostgreSQL
    │
    ▼
HTTP Response (via use-case output)
```

---

## Module Diagram

```
┌──────────────────────────────────────────────────────────────┐
│               supabase/functions/<fn>/index.ts               │
│  (HTTP adapter: parse → call use case → return response)     │
└────────────────────────┬─────────────────────────────────────┘
                         │ imports use cases from
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    backend/src/modules/                       │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   mix-session   │  │   contact    │  │    health      │  │
│  │  ─────────────  │  │  ──────────  │  │  ────────────  │  │
│  │  domain/        │  │  domain/     │  │  application/  │  │
│  │  application/   │  │  application/│  │  use-cases/    │  │
│  │    use-cases/   │  │  use-cases/  │  │                │  │
│  │    ports/       │  │  ports/      │  │                │  │
│  └────────┬────────┘  └──────┬───────┘  └────────────────┘  │
└───────────┼─────────────────┼──────────────────────────────-─┘
            │ implements ports │
            ▼                 ▼
┌──────────────────────────────────────────────────────────────┐
│          supabase/functions/_shared/repositories/            │
│  (Deno runtime: SupabaseMixSessionRepository,                │
│   SupabaseContactRepository, SupabaseRateLimitRepository)    │
└──────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
backend/src/
├── bootstrap/
│   └── container.ts          # DI wiring — builds all use cases
├── shared/
│   ├── application/
│   │   └── UseCase.ts        # Base use-case interface
│   ├── ports/
│   │   └── RateLimitRepository.ts  # Shared rate-limit port
│   ├── events/               # DomainEvent, EventBus (existing)
│   ├── http/                 # HTTP response builders (existing)
│   └── policies/             # Policy abstractions (existing)
├── modules/
│   ├── mix-session/          # NEW — mixing session bounded context
│   │   ├── domain/MixSession.ts
│   │   ├── application/ports/MixSessionRepository.ts
│   │   └── application/use-cases/
│   │       ├── CreateMixSession.ts
│   │       ├── GetMixSessionStatus.ts
│   │       └── CleanupExpiredSessions.ts
│   ├── contact/              # NEW — contact form bounded context
│   │   ├── domain/ContactTicket.ts
│   │   ├── application/ports/ContactRepository.ts
│   │   └── application/use-cases/SubmitContactMessage.ts
│   ├── health/               # NEW — health check module
│   │   └── application/use-cases/GetSystemHealth.ts
│   ├── address-generator/    # (existing)
│   ├── blockchain-monitor/   # (existing)
│   ├── liquidity-pool/       # (existing)
│   ├── log-minimizer/        # (existing)
│   ├── payment-scheduler/    # (existing)
│   └── deposit-saga/         # (existing)
└── infra/
    ├── persistence/
    │   └── supabase/
    │       ├── client.ts     # Node.js Supabase singleton
    │       └── repositories/ # Node.js repository implementations
    └── ... (existing)

supabase/functions/
├── _shared/
│   ├── repositories/         # NEW — Deno repository implementations
│   │   ├── SupabaseMixSessionRepository.ts
│   │   ├── SupabaseContactRepository.ts
│   │   └── SupabaseRateLimitRepository.ts
│   ├── security-headers.ts   # (existing)
│   ├── error-response.ts     # (existing)
│   ├── structured-logger.ts  # (existing)
│   └── rate-limiter.ts       # (existing — legacy, kept for reference)
├── mix-sessions/index.ts     # Thin adapter → CreateMixSessionUseCase
├── mix-session-status/index.ts # Thin adapter → GetMixSessionStatusUseCase
├── cleanup/index.ts          # Thin adapter → CleanupExpiredSessionsUseCase
├── contact/index.ts          # Thin adapter → SubmitContactMessageUseCase
└── health/index.ts           # Thin adapter → GetSystemHealthUseCase
```

---

## Use Cases

| Use Case | Module | What it does |
|----------|--------|-------------|
| `CreateMixSessionUseCase` | mix-session | Rate-limit check, generate address, persist session |
| `GetMixSessionStatusUseCase` | mix-session | UUID validation, expiry check, auto-update status |
| `CleanupExpiredSessionsUseCase` | mix-session | Mark stale sessions expired, prune old rate limits |
| `SubmitContactMessageUseCase` | contact | Rate-limit, validate & sanitise, generate ticket ID, persist |
| `GetSystemHealthUseCase` | health | Return uptime, version, timestamp |

---

## Dependency Rules

```
Domain           → (nothing external)
Application      → Domain, Shared Ports
Infrastructure   → Application (implements ports), Domain
HTTP Adapter     → Application (calls use cases)
```

**Domain MUST NOT depend on Infrastructure.**
**Edge Functions MUST NOT contain business logic.**

---

## Policy Objects

Complex business rules are encapsulated in policy objects:

| Policy | Location | Purpose |
|--------|----------|---------|
| `AddressExpirationPolicy` | address-generator/domain/policies | TTL per namespace purpose |
| `AddressGenerationPolicy` | address-generator/domain/policies | Max active addresses per network |
| `PoolHealthPolicy` | liquidity-pool/domain/policies | Health evaluation and thresholds |
| `LogRetentionPolicy` | log-minimizer/domain/policies | Data classification and retention |
| `RateLimitPolicy` | payment-scheduler/domain/policies | Rate limit evaluation |

---

## Bootstrap / DI Container

```typescript
import { buildContainer } from 'backend/src/bootstrap/container';
import { getSupabaseClient } from 'backend/src/infra/persistence/supabase/client';
import { SupabaseMixSessionRepository } from 'backend/src/infra/persistence/supabase/repositories/SupabaseMixSessionRepository';
import { SupabaseContactRepository }    from 'backend/src/infra/persistence/supabase/repositories/SupabaseContactRepository';
import { SupabaseRateLimitRepository }  from 'backend/src/infra/persistence/supabase/repositories/SupabaseRateLimitRepository';

const client    = getSupabaseClient();
const container = buildContainer({
  mixSessionRepo: new SupabaseMixSessionRepository(client),
  contactRepo:    new SupabaseContactRepository(client),
  rateLimitRepo:  new SupabaseRateLimitRepository(client),
});

// container.createMixSession.execute(...)
// container.submitContactMessage.execute(...)
```

---

## Edge Functions (Adapters)

| Function | Method | Use Case Called |
|----------|--------|-----------------|
| `mix-sessions` | POST | `CreateMixSessionUseCase` |
| `mix-session-status` | POST | `GetMixSessionStatusUseCase` |
| `contact` | POST | `SubmitContactMessageUseCase` |
| `health` | GET/POST | `GetSystemHealthUseCase` |
| `cleanup` | POST | `CleanupExpiredSessionsUseCase` |

