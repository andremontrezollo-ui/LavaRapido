# ShadowMix — Architecture Document

> **Decisão Arquitetural Definitiva (ADR-001):** O runtime HTTP oficial é **Supabase Edge Functions (Deno)**. O diretório `backend/src/` é uma biblioteca de domínio puro (sem servidor, sem I/O direto). Não existe servidor Node.js/Express intermediário. Ver `backend/ARCHITECTURE.md` para o raciocínio completo.

## Overview

ShadowMix follows **Clean Architecture + Domain-Driven Design (DDD)** with strict module boundaries and event-driven inter-module communication.

## Module Diagram

```
┌──────────────────────────────────────────────────────────┐
│              HTTP Entry Layer (Deno runtime)              │
│         Supabase Edge Functions — supabase/functions/     │
│                                                           │
│  mix-sessions  mix-session-status  contact  health  cleanup│
│              └──────────────┬──────────────────┘         │
│                              │                            │
│                 supabase/functions/_shared/               │
│           security-headers  error-response  rate-limiter  │
└──────────────────────────────┬────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────┐
│           Domain / Application Library                    │
│                   backend/src/                            │
│                                                           │
│  modules/                       shared/                   │
│    address-generator              events/ (EventBus)      │
│    blockchain-monitor             policies/ (base)        │
│    liquidity-pool                 ports/ (Repository…)    │
│    payment-scheduler              logging/ (Logger)       │
│    log-minimizer                  config/ (AppConfig)     │
│                                                           │
│  infra/                                                   │
│    persistence/ (in-memory stores)                        │
│    saga/ (SagaOrchestrator)                               │
│    scheduler/ (SecureJobScheduler)                        │
│    observability/ (StructuredLogger)                      │
└──────────────────────────────┬────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────┐
│                      Data Layer                           │
│               Supabase / PostgreSQL                       │
│                                                           │
│  mix_sessions  contact_tickets  rate_limits               │
│  RLS policies  pg_cron cleanup  migrations                │
└───────────────────────────────────────────────────────────┘
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
Domain      ──► (nothing — zero external dependencies)
Application ──► Domain, Shared Ports
Infrastructure ──► Application (implements ports), Domain
Edge Function  ──► Application (orchestrates use cases via ports)
```

**Domain MUST NOT depend on Infrastructure, Supabase, or any I/O.**

**Edge Functions MUST NOT contain business logic — only HTTP glue.**

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

> **These are the ONLY HTTP entry points.** No Node.js server exists or should ever exist in this project.

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

## Architectural Decision Record

The full architectural analysis, migration rationale, mandatory rules, and validation checklist are documented in [`backend/ARCHITECTURE.md`](../backend/ARCHITECTURE.md).
