# ShadowMix — Architecture Document

## Overview

ShadowMix follows **Clean Architecture + Domain-Driven Design (DDD)** with strict module boundaries and event-driven inter-module communication.

## Layer Responsibilities

```
src/                      ← Frontend only (React + TypeScript)
supabase/functions/       ← HTTP entry points (Edge Functions, Deno runtime)
  ├── <function>/         ← One function per HTTP endpoint
  └── _shared/            ← Shared runtime modules (use cases, ports, adapters)
      ├── use-cases/      ← Business logic, domain decisions
      ├── ports/          ← Repository/service interfaces (contracts)
      ├── adapters/       ← Concrete Supabase implementations
      ├── security-headers.ts
      ├── error-response.ts
      ├── structured-logger.ts
      └── rate-limiter.ts (IP hashing utility)
backend/                  ← Domain core (Node.js/TypeScript)
  └── src/modules/        ← Domain entities, value objects, use cases, ports
      ├── mix-session/    ← Mix session lifecycle domain
      ├── contact/        ← Contact/support ticket domain
      ├── address-generator/
      ├── blockchain-monitor/
      ├── deposit-saga/
      ├── liquidity-pool/
      ├── log-minimizer/
      └── payment-scheduler/
```

## Request Flow

Each Edge Function is a thin HTTP handler. Business logic lives in `_shared/use-cases/`.

```
Request
  → Edge Function (parse + auth headers)
    → Use Case (_shared/use-cases/)
      → Port interface (_shared/ports/)
        → Adapter (_shared/adapters/)
          → Supabase DB
```

## Module Diagram

```
┌────────────────────────────────────────────────────────┐
│                    HTTP Entry (Edge Functions)          │
│  mix-sessions | mix-session-status | contact | cleanup  │
└───────────────┬─────────────────────────────────────────┘
                │ delegates to
┌───────────────▼─────────────────────────────────────────┐
│              _shared/use-cases/ (business logic)        │
│  create-mix-session | get-session-status                │
│  create-contact-ticket | run-cleanup                    │
└───────────────┬─────────────────────────────────────────┘
                │ calls via
┌───────────────▼─────────────────────────────────────────┐
│              _shared/ports/ (interfaces/contracts)      │
│  MixSessionRepository | ContactRepository               │
│  RateLimitRepository                                    │
└───────────────┬─────────────────────────────────────────┘
                │ implemented by
┌───────────────▼─────────────────────────────────────────┐
│              _shared/adapters/ (Supabase implementations)│
│  supabase-mix-session | supabase-contact                │
│  supabase-rate-limit                                    │
└───────────────┬─────────────────────────────────────────┘
                │
         Supabase Database
```

## Modules (backend/)

| Module | Responsibility |
|--------|---------------|
| **mix-session** | Mix session lifecycle: creation, status, expiry |
| **contact** | Support ticket submission and validation |
| **address-generator** | Unique, non-reusable token/address per operation |
| **blockchain-monitor** | Observes blockchain state, normalizes events |
| **liquidity-pool** | Structural dissociation layer for fund aggregation |
| **log-minimizer** | Privacy-preserving logging with data classification and retention |
| **payment-scheduler** | Scheduling policies, time windows, batch management |
| **deposit-saga** | Coordinates blockchain-monitor → liquidity-pool → payment-scheduler |

## Inter-Module Communication

Modules **never** import directly from each other. Communication flows through the **EventBus**:

```
mix-session ──► EventBus ──► blockchain-monitor
address-generator              liquidity-pool
                               payment-scheduler
                               log-minimizer
```

### Event Flow Example

1. `mix-session` emits `SESSION_CREATED`
2. `address-generator` issues a fresh deposit address token
3. `blockchain-monitor` watches for deposits on that address
4. On deposit detection, emits `TRANSACTION_CONFIRMED`
5. `liquidity-pool` reserves funds via `LIQUIDITY_RESERVED`
6. `payment-scheduler` plans outputs via `PAYMENT_PLANNED`

## Dependency Rules

```
Domain ──► (nothing external)
Application ──► Domain, Shared Ports
Infrastructure ──► Application (implements ports), Domain
API (Edge Functions) ──► use-cases (orchestrates), ports (contracts)
```

**Domain MUST NOT depend on Infrastructure.**
**Edge Functions MUST NOT contain business logic — delegate to use cases.**

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
| `mix-sessions` | POST | Create mixing session (delegates to `create-mix-session` use case) |
| `mix-session-status` | POST | Query session status (delegates to `get-session-status` use case) |
| `contact` | POST | Create support ticket (delegates to `create-contact-ticket` use case) |
| `health` | GET/POST | Health check |
| `cleanup` | POST | Expire sessions, prune rate limits (delegates to `run-cleanup` use case) |

## Shared Utilities

All Edge Functions use shared utilities from `_shared/`:
- `security-headers.ts` — Centralized CORS + security headers
- `error-response.ts` — Standardized error format
- `structured-logger.ts` — Privacy-preserving structured logs
- `rate-limiter.ts` — IP hashing utility (rate limit logic is in `use-cases/`)
- `ports/` — Repository and service interfaces
- `adapters/` — Concrete Supabase implementations
- `use-cases/` — Business logic (single source of truth for domain decisions)

