# ShadowMix — Architecture Document

## Overview

ShadowMix follows **Clean Architecture + Domain-Driven Design (DDD)** with strict module boundaries and event-driven inter-module communication.

## Runtime Architecture

```
supabase/functions/          ← HTTP Adapter layer (Deno / Edge Functions)
  mix-sessions/              │  parse request → call use case → return HTTP response
  mix-session-status/        │  NO business logic here
  contact/                   │
  health/                    │
  cleanup/                   │
  _shared/                   │  security-headers, error-response, structured-logger
       │
       │  import use cases via relative path
       ▼
backend/src/                 ← Core (Node.js / TypeScript)
  bootstrap/container.ts     │  wires use cases with Supabase repositories
  modules/
    mix-session/             │  CreateMixSession, GetMixSessionStatus, CleanupExpiredSessions
    contact/                 │  SubmitContactMessage
    health/                  │  GetSystemHealth
    address-generator/       │  GenerateAddress, IssueAddressToken
    blockchain-monitor/      │  ConfirmDeposit, IngestBlockchainEvent
    liquidity-pool/          │  ReserveLiquidity, AllocateLiquidity
    payment-scheduler/       │  SchedulePayment, MarkPaymentExecuted
    log-minimizer/           │  ClassifyLogData, PurgeExpiredLogs
  infra/persistence/supabase/ │  SupabaseMixSessionRepository, SupabaseContactRepository,
                             │  SupabaseRateLimitRepository
  shared/application/        │  UseCase<TInput, TOutput> interface
```

## Module Diagram

```
┌────────────────────────────────────────────────────────┐
│           HTTP Adapter (supabase/functions)            │
│  parse request · auth · call use case · return HTTP    │
└───────────────────────────┬────────────────────────────┘
                            │ imports
┌───────────────────────────▼────────────────────────────┐
│         Application Layer (backend/src/modules)        │
│  Use Cases · DTOs · Ports (interfaces)                 │
└───────────────┬───────────────────────┬────────────────┘
                │                       │
       ┌────────▼────────┐     ┌────────▼────────┐
       │  Domain          │     │  Domain          │
       │  Entities · VOs  │     │  Entities · VOs  │
       │  Policies        │     │  Policies        │
       │  Domain Events   │     │  Domain Events   │
       └─────────────────┘     └─────────────────┘
                │                       │
       ┌────────▼───────────────────────▼────────┐
       │              Shared Kernel               │
       │  UseCase · Result · DomainEvent          │
       │  EventBus · Ports · Policies base        │
       └──────────────────┬──────────────────────┘
                          │
       ┌──────────────────▼──────────────────────┐
       │      Infrastructure (infra/persistence)  │
       │  SupabaseMixSessionRepository            │
       │  SupabaseContactRepository               │
       │  SupabaseRateLimitRepository             │
       │  InMemory* repositories (tests/dev)      │
       └─────────────────────────────────────────┘
```

## Modules

| Module | Responsibility |
|--------|---------------|
| **mix-session** | Mixing session lifecycle: create, query status, expire |
| **contact** | Support ticket submission with validation and rate limiting |
| **health** | Service health status |
| **address-generator** | Unique, non-reusable address tokens per operation |
| **blockchain-monitor** | Observes blockchain state, normalises events |
| **liquidity-pool** | Structural dissociation layer for fund aggregation |
| **log-minimizer** | Privacy-preserving logging with data classification and retention |
| **payment-scheduler** | Scheduling policies, time windows, batch management |

## Module Layout (consistent across all modules)

```
modules/<name>/
  domain/
    entities/       ← aggregate roots, entities
    value-objects/  ← immutable domain concepts
    policies/       ← business rule evaluators
    events/         ← domain events
  application/
    use-cases/      ← orchestrate domain logic, call ports
    ports/          ← interfaces (Repository, Service, etc.)
    dtos/           ← input/output contracts
  infra/
    repositories/   ← in-memory or DB implementations of ports
    adapters/       ← external service adapters
  index.ts          ← public API (explicit exports only)
```

## Request Flow

```
HTTP Request
    │
    ▼
supabase/functions/<name>/index.ts
    │ 1. parse & validate HTTP input (only structural validation — is it a UUID?)
    │ 2. extract client IP
    │
    ▼
backend/src/bootstrap/container.ts
    │ pre-wired use case instance
    │
    ▼
backend/src/modules/<name>/application/use-cases/<UseCase>.ts
    │ 1. rate-limit check (via RateLimitRepository port)
    │ 2. domain validation (business rules)
    │ 3. generate domain objects
    │ 4. persist via Repository port
    │ 5. return typed DTO
    │
    ▼
backend/src/infra/persistence/supabase/repositories/
    │ Supabase client calls
    │
    ▼
HTTP Response
```

## Dependency Rules

```
Domain         ──► (nothing external)
Application    ──► Domain, Shared Kernel (UseCase, Result, ports)
Infrastructure ──► Application (implements ports), Domain
HTTP Adapter   ──► Application (calls use cases only)
```

**The Domain layer MUST NOT depend on Infrastructure or HTTP concerns.**

## Business Rules Location

All business rules live exclusively in `backend/src/modules/`:

| Rule | Module | File |
|------|--------|------|
| Session TTL = 30 min | mix-session | create-mix-session.usecase.ts |
| Max 10 sessions / 10 min per IP | mix-session | create-mix-session.usecase.ts |
| Session expiry check | mix-session | mix-session.entity.ts |
| Contact subject 3–100 chars | contact | submit-contact-message.usecase.ts |
| Contact message 10–2000 chars | contact | submit-contact-message.usecase.ts |
| Max 5 contact tickets / 10 min per IP | contact | submit-contact-message.usecase.ts |
| Input sanitization | contact | contact-ticket.entity.ts |
| Rate limit cleanup TTL = 1 hour | mix-session | cleanup-expired-sessions.usecase.ts |

## Edge Functions (Runtime Adapters)

| Function | Method | Delegates to |
|----------|--------|-------------|
| `mix-sessions` | POST | `CreateMixSessionUseCase` |
| `mix-session-status` | POST | `GetMixSessionStatusUseCase` |
| `contact` | POST | `SubmitContactMessageUseCase` |
| `health` | GET/POST | `GetSystemHealthUseCase` |
| `cleanup` | POST | `CleanupExpiredSessionsUseCase` |

## Shared Utilities

Edge Functions use `_shared/` for HTTP-level concerns only:
- `security-headers.ts` — Centralized CORS + security headers
- `error-response.ts` — Standardised HTTP error format
- `structured-logger.ts` — Privacy-preserving structured logs (no business logic)

## Inter-Module Communication (DDD Modules)

The DDD modules (address-generator, blockchain-monitor, etc.) **never** import directly from each other.
Communication flows through the **EventBus**:

```
address-generator ──► EventBus ──► blockchain-monitor
                                   liquidity-pool
                                   payment-scheduler
                                   log-minimizer
```

