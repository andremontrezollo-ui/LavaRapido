# ShadowMix — Domain Library (NOT a production runtime)

> ⚠️ **IMPORTANT: This directory is NOT the production backend.**
>
> `backend/` is a **domain library and architectural blueprint** used as a reference implementation and shared-domain foundation. It does **not** run in production.
>
> **The production HTTP runtime is `supabase/functions/` (Deno Edge Functions).**
> See [`docs/adr/0001-backend-runtime-source-of-truth.md`](../docs/adr/0001-backend-runtime-source-of-truth.md) for the full architectural decision record.

---

## Role of this directory

`backend/src/` provides a **pure domain library** organized following Clean Architecture and DDD principles. It defines:

- Business entities, value objects, domain events and policies
- Use-case interfaces and application-layer orchestration contracts
- Shared kernel types (IDs, clocks, events, result types)
- Infrastructure port interfaces (no concrete runtime dependencies)

The concrete HTTP entry-points that actually serve requests live in `supabase/functions/`.

---

## Module Structure

Each module follows a three-layer architecture:

```
module/
├── domain/       # Business entities, value objects, domain events
├── application/  # Use cases, orchestration, no I/O
└── infra/        # Adapters, port implementations (in-memory reference)
```

## Modules

| Module | Responsibility |
|--------|----------------|
| `blockchain-monitor` | Domain model for blockchain event observation |
| `address-generator` | Domain model for unique, non-reusable deposit identifiers |
| `payment-scheduler` | Domain model for asynchronous execution with time windows |
| `liquidity-pool` | Domain model for structural fund-aggregation dissociation |
| `log-minimizer` | Domain model for privacy-preserving metadata retention |

## Cross-Cutting Concerns

- **api/**: Controller/middleware blueprints — reference implementations, not active endpoints
- **shared/**: Shared kernel (IDs, clocks, events, ports, result types)
- **infra/**: Infrastructure adapters and abstractions (in-memory reference implementations)

## Design Principles

1. **Low Coupling**: Modules communicate via events and stable contracts
2. **Privacy by Architecture**: Minimal data collection, segregated contexts
3. **Security by Design**: Defense in depth, no secrets in application code
4. **Auditability**: Privacy-preserving logs without user reidentification

---

## What is NOT here

- ❌ No active HTTP server — `backend/src/app/application.ts` is a Node.js blueprint, not deployed
- ❌ No deploy scripts for this directory
- ❌ No CI pipeline targets this directory as a runtime
- ❌ `backend/package.json` lists Node.js dependencies that are **not installed or executed in production**

## Where production runs

All production HTTP traffic is handled by `supabase/functions/` (Deno):

```
supabase/functions/
├── mix-sessions/       → POST /functions/v1/mix-sessions
├── mix-session-status/ → POST /functions/v1/mix-session-status
├── contact/            → POST /functions/v1/contact
├── health/             → GET|POST /functions/v1/health
├── cleanup/            → POST /functions/v1/cleanup
└── _shared/            → Shared utilities (security headers, logging, rate limiting)
```
