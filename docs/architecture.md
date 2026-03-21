# ShadowMix — Architecture Document

## Runtime Topology

```
Browser (React SPA)
  └── src/services/backend-client.ts   ← sole gateway to backend
        └── Supabase Edge Functions (Deno)
              ├── mix-sessions          POST  create session
              ├── mix-session-status    POST  query status
              ├── contact               POST  support ticket
              ├── health                GET   health check
              └── cleanup               POST  expire & prune
```

**There is no Node.js HTTP server.**
`experimental/backend-legacy/` is a domain library for architectural reference only.

---

## Frontend Layers

```
src/pages/           UI orchestrators — no business logic
src/features/
  └── mixing/
      ├── domain/        pure functions: validation, address redistribution
      ├── application/   state machine, use-case transitions (no React, no I/O)
      ├── infrastructure/ I/O boundary — calls backend-client.ts
      └── ui/            component barrel
src/components/      Shared React components
src/services/        backend-client.ts — single point of backend communication
src/contracts/       Canonical API type definitions (wire format)
src/test/fixtures/   Mock generators — test/dev only, never in production bundles
```

### Dependency Rules

```
Domain       → nothing external
Application  → Domain, contracts, test/fixtures (type conversions only)
Infrastructure → services/backend-client
UI (pages)   → Application, Infrastructure, Components
```

---

## Edge Functions — Shared Utilities

All shared code lives in `supabase/functions/_shared/core/`:

| File | Purpose |
|------|---------|
| `security-headers.ts` | CORS headers, security headers, `jsonResponse()` |
| `error-response.ts` | Standardized error format and helpers |
| `structured-logger.ts` | Privacy-preserving JSON structured logs |
| `rate-limiter.ts` | IP-hash based rate limiting via Supabase table |

Files directly under `_shared/` are re-export shims kept for backward compatibility.

---

## Backend Domain Library (`experimental/backend-legacy/`)

Isolated for **architectural reference only**.  Contains Clean Architecture modules
with domain entities, value objects, policies, use-cases, and infra adapters.

**Never imported by the frontend.  Never deployed.**

### Module Map

| Module | Responsibility |
|--------|---------------|
| `address-generator` | Unique, non-reusable token identifiers per operation |
| `blockchain-monitor` | Observes blockchain state, normalizes events |
| `liquidity-pool` | Structural dissociation layer for fund aggregation |
| `log-minimizer` | Privacy-preserving logging with data classification |
| `payment-scheduler` | Scheduling policies, time windows, batch management |

---

## API Contract

Single source of truth: `src/contracts/mix-session.ts`

Types are shared by:
- `src/services/backend-client.ts` (consumer)
- `supabase/functions/mix-sessions/index.ts` (producer)
- `src/test/fixtures/mock-session.ts` (test adapter)

See `docs/api-contract.md` for endpoint details.
