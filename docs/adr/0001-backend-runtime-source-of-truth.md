# ADR-0001: Supabase Edge Functions as the Sole HTTP Runtime

**Date:** 2026-03-21
**Status:** Accepted

---

## Context

The repository contains two separate structures that could be mistaken for executable backends:

1. **`backend/src/`** — A TypeScript domain library organized using Clean Architecture and DDD. Contains modules (`address-generator`, `blockchain-monitor`, `liquidity-pool`, `log-minimizer`, `payment-scheduler`, `deposit-saga`), a shared kernel, and an API layer with controllers, middlewares, and error handlers.

2. **`supabase/functions/`** — Deno Edge Functions (`mix-sessions`, `mix-session-status`, `contact`, `health`, `cleanup`) that are the actual deployed HTTP endpoints.

This distinction was previously ambiguous, leading to:
- Broken Node.js HTTP server code in `backend/src/app/` (removed)
- Dead database adapters using TypeORM/MySQL (removed)
- Dead rate-limit adapter using legacy Redis callback API (removed)
- Confusion about which layer "owns" validation, logging, and security

---

## Decision

**Supabase Edge Functions (`supabase/functions/`) are the sole HTTP entry point for all backend operations.**

`backend/src/` is a **pure TypeScript domain library** — it contains domain entities, value objects, policies, application use-cases, ports, and infrastructure adapters as TypeScript classes. It has no HTTP server, no Express, no Node.js runtime bindings, and is not deployed independently.

The runtime dependency chain is:

```
Frontend (React SPA)
    └─► Supabase Edge Functions (Deno)   ← HTTP runtime
            └─► backend/src/             ← domain library (imported as needed)
                    └─► supabase/migrations/  ← database schema
```

---

## Consequences

### Positive

- Clear single source of truth for HTTP routing, auth, rate limiting, and responses
- Edge Functions are stateless, auto-scaling, and co-located with the database
- Domain library (`backend/src/`) can be tested independently without HTTP infrastructure
- No confusion about which backend to deploy

### Negative

- Edge Functions (Deno) and domain library (TypeScript/Node) are different runtimes; importing `backend/src/` from Edge Functions requires explicit `.ts` path resolution (not npm packages)
- Shared utilities between Edge Functions (e.g., `_shared/`) must be Deno-compatible and cannot use Node-only APIs

### Neutral

- Validation logic exists in three places by design: frontend (Zod, for UX), Edge Functions (inline, for security), and `backend/src/api/schemas/` (portable, for unit testing). This is intentional defense-in-depth, not accidental duplication, provided the schemas remain consistent.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| Node.js Express server (`backend/src/app/`) | Requires separate deployment, adds ops complexity, conflicts with Supabase co-location |
| Separate backend repo | Unnecessary for current scale; monorepo is simpler |
| Frontend calling Supabase JS client directly | Bypasses Edge Function middleware (auth, rate limiting, logging) — rejected for security |
