# Architecture — ShadowMix Backend

## Layer Map

```
┌─────────────────────────────────────┐
│         React Frontend              │
│         (src/)                      │
│  Only calls supabase/functions      │
└──────────────┬──────────────────────┘
               │ HTTP
               ▼
┌─────────────────────────────────────┐
│   HTTP Entry Layer                  │
│   (supabase/functions/)             │
│                                     │
│   ▸ Request / response handling     │
│   ▸ CORS & security headers         │
│   ▸ Rate limiting                   │
│   ▸ Logging                         │
│   ▸ Delegates all business rules ──►│
└──────────────┬──────────────────────┘
               │ import (direct file path)
               ▼
┌─────────────────────────────────────┐
│   CORE OFFICIAL                     │
│   backend/src/                      │
│                                     │
│   modules/          ← domain logic  │
│     address-generator/              │
│     blockchain-monitor/             │
│     contact/        ← NEW           │
│     deposit-saga/                   │
│     liquidity-pool/                 │
│     log-minimizer/                  │
│     mix-session/    ← NEW           │
│     payment-scheduler/              │
│                                     │
│   infra/            ← shared infra  │
│     observability/StructuredLogger  │
│     security/SecurityHeaders        │
│     database/, messaging/, …        │
│                                     │
│   api/              ← future Node   │
│   shared/                           │
└─────────────────────────────────────┘
```

## Principles

| Rule | Detail |
|------|--------|
| **Single backend** | `backend/src` is the one and only backend. There is no second backend. |
| **Core owns business rules** | Address generation, session TTL, input validation, ticket-ID generation — all live in `backend/src/modules/`. |
| **Edge functions are thin HTTP adapters** | `supabase/functions/` handles HTTP concerns only (headers, rate-limits, CORS, logging) and delegates every business decision to `backend/src`. |
| **Frontend is read-only of functions** | `src/lib/api.ts` calls `/functions/v1/*` exclusively. It never imports from `backend/`. |
| **No duplicated logic** | `supabase/functions/_shared/` imports constants and utilities from `backend/src/infra/` instead of copying them. |

## Data Flow

```
User action (React)
  └─► src/lib/api.ts          callFunction("mix-sessions")
        └─► POST /functions/v1/mix-sessions
              └─► supabase/functions/mix-sessions/index.ts
                    ├─ rate-limit check        (_shared/rate-limiter.ts)
                    ├─ generateDepositAddress  ◄── backend/src/modules/mix-session/domain
                    ├─ getSessionExpiresAt     ◄── backend/src/modules/mix-session/domain
                    └─ DB insert               (Supabase PostgreSQL)
```

## Module Ownership

### `backend/src/modules/mix-session/`
Canonical home for mix-session domain logic:
- `generateDepositAddress(network)` — cryptographically secure BTC address
- `getSessionExpiresAt(createdAt?)` — computes session expiry (30 min TTL)
- `isSessionExpired(expiresAt)` — checks whether a session has expired
- `SESSION_TTL_MS` — authoritative TTL constant

### `backend/src/modules/contact/`
Canonical home for contact-form domain logic:
- `sanitizeInput(input)` — strips control chars, collapses whitespace
- `generateTicketId()` — random `TKT-XXXXXX` identifier
- `validateContactPayload(body)` — validates & sanitizes the full payload

### `backend/src/infra/observability/StructuredLogger.ts`
Canonical structured logger. `supabase/functions/_shared/structured-logger.ts`
wraps this class with a function-based API for the Deno runtime.

### `backend/src/infra/security/SecurityHeaders.ts`
Canonical security header constants. `supabase/functions/_shared/security-headers.ts`
re-exports these constants and adds Deno `Response` helpers on top.
