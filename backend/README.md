# ShadowMix — Domain Library

This package (`backend/`) is a **pure domain library**. It contains no HTTP server, no database driver, and no runtime process to start.

## Role in the Architecture

```
supabase/functions/   ← Official HTTP runtime (Supabase Edge Functions, Deno)
backend/src/          ← Domain library (Clean Architecture + DDD, Node-compatible TypeScript)
src/                  ← React frontend (calls Edge Functions only)
```

`backend/src/` can be imported by Edge Functions to share domain logic, but it has **no HTTP surface of its own**. The sole official backend runtime is `supabase/functions/`.

## Module Structure

Each module follows a three-layer architecture:

```
module/
├── domain/       # Business entities, value objects, domain events
├── application/  # Use cases, orchestration, no I/O
└── infra/        # Adapters, repositories, in-memory implementations
```

## Modules

| Module | Responsibility |
|--------|----------------|
| `blockchain-monitor` | Observes blockchain events (confirmations, fees) |
| `address-generator` | Creates unique, non-reusable identifiers per operation |
| `payment-scheduler` | Manages asynchronous execution with variable time windows |
| `liquidity-pool` | Structural dissociation layer for fund aggregation |
| `log-minimizer` | Automatic removal of sensitive metadata |

## Cross-Cutting Concerns

- **shared/**: Minimal shared kernel (IDs, clocks, events, ports, result types)
- **infra/**: In-memory implementations of persistence, locks, saga, scheduler, observability

## Design Principles

1. **No HTTP**: This library has no server. HTTP is handled exclusively by Supabase Edge Functions.
2. **Low Coupling**: Modules communicate via events and stable contracts.
3. **Privacy by Architecture**: Minimal data collection, segregated contexts.
4. **Security by Design**: Defense in depth, no secrets in application code.
5. **Auditability**: Privacy-preserving logs without user reidentification.

## What Was Removed

The following Node/Express artifacts were removed because they had no deployment path in this architecture:

- `backend/src/api/` — Express HTTP controllers and middleware (replaced by Edge Functions)
- `backend/src/app/` — Node.js HTTP server bootstrap (replaced by Edge Functions)
- `backend/src/infra/database/` — TypeORM/MySQL connection (not used; Supabase DB accessed via Edge Functions)
- `backend/src/infra/rate-limit/` — Redis rate limiter (not used; Edge Functions use in-function rate limiting)

