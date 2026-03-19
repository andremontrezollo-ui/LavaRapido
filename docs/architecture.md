# ShadowMix — Architecture

## Overview

ShadowMix follows **Clean Architecture** with strict layer boundaries and a single source of truth for business logic.

```
Frontend (React SPA)
        │ HTTP
        ▼
supabase/functions/*   ← HTTP adapters (Deno Edge Functions)
        │ imports
        ▼
backend/src/*          ← Domain + Application core (pure TypeScript)
        │ port interfaces
        ▼
supabase/functions/_shared/adapters/*  ← Supabase infra implementations
        │
        ▼
Supabase (PostgreSQL)
```

## Layer Responsibilities

### `src/` — Frontend

- React 18 SPA
- UI rendering, form handling, routing
- Calls the API via `src/lib/api.ts`
- Uses only public `VITE_*` environment variables
- **Must not** contain business logic or access Supabase directly for mutations

### `supabase/functions/` — HTTP Entry Layer

- Deno Edge Functions deployed on Supabase
- Each function is a **thin HTTP adapter** only:
  1. Parse and validate the HTTP request
  2. Extract client IP, compute IP hash for rate limiting
  3. Check rate limit via `SupabaseRateLimitRepository`
  4. Instantiate the use case with Supabase-backed repositories
  5. Execute the use case
  6. Serialise the result or map domain errors to HTTP responses
- **Must not** contain business logic, domain decisions, or raw DB queries

### `supabase/functions/_shared/` — Edge Utilities

| File / Dir | Purpose |
|-----------|---------|
| `security-headers.ts` | CORS + security response headers |
| `error-response.ts` | Standardised error serialisation |
| `structured-logger.ts` | Privacy-preserving JSON logger |
| `rate-limiter.ts` | Rate-limit helpers (delegates to backend port) |
| `adapters/` | Supabase implementations of backend port interfaces |

### `backend/src/` — Domain and Application Core

Pure TypeScript library.  No HTTP, no Deno-specific imports, no environment variables read here.

```
backend/src/
├── modules/
│   ├── mix-session/
│   │   ├── domain/entities/mix-session.entity.ts
│   │   ├── domain/errors/session-not-found.error.ts
│   │   └── application/
│   │       ├── ports/mix-session-repository.port.ts
│   │       ├── dtos/
│   │       └── use-cases/
│   │           ├── create-mix-session.usecase.ts
│   │           └── get-session-status.usecase.ts
│   ├── contact/
│   │   ├── domain/entities/contact-ticket.entity.ts
│   │   ├── domain/errors/invalid-contact-input.error.ts
│   │   └── application/
│   │       ├── ports/contact-repository.port.ts
│   │       ├── dtos/
│   │       └── use-cases/create-contact-ticket.usecase.ts
│   ├── health/
│   │   └── application/
│   │       ├── dtos/health-response.dto.ts
│   │       └── use-cases/health-check.usecase.ts
│   └── cleanup/
│       └── application/
│           ├── ports/cleanup-repository.port.ts
│           ├── dtos/cleanup-result.dto.ts
│           └── use-cases/run-cleanup.usecase.ts
└── shared/
    ├── errors/domain-error.ts
    ├── ports/
    │   ├── Clock.ts · IdGenerator.ts · Repository.ts · DistributedLock.ts
    │   └── RateLimitRepository.ts
    ├── utils/
    │   ├── id-generator.ts   (generateUuid, generateMockTestnetAddress, generateTicketId)
    │   ├── hash.ts           (hashString — SHA-256 via Web Crypto)
    │   └── sanitize.ts       (sanitizeInput)
    ├── logging/
    │   ├── logger.ts         (SecureLogger)
    │   └── redaction-policy.ts
    └── policies/
        ├── Policy.ts
        └── ExplainablePolicy.ts
```

## Dependency Rules

| From | May import |
|------|-----------|
| `domain/` | Nothing external |
| `application/` | Own `domain/`, `backend/src/shared/` |
| `supabase/functions/*/index.ts` | `backend/src` use cases, own `_shared/` |
| `_shared/adapters/` | Backend port interfaces, Supabase JS SDK |
| `src/` (frontend) | Own `src/lib/`, `src/integrations/` |

## Request Flow

```
POST /functions/v1/mix-sessions
         │
         ▼ Edge Function: supabase/functions/mix-sessions/index.ts
   hash client IP
   check rate limit   ──► SupabaseRateLimitRepository
         │
         ▼ CreateMixSessionUseCase (backend/src)
   generateUuid()
   generateMockTestnetAddress()
   sessions.create(...)  ──► SupabaseMixSessionRepository ──► Supabase DB
         │
         ▼
   serialize result → 201 JSON
```

## Edge Functions

| Function | Method | Use Case |
|----------|--------|----------|
| `mix-sessions` | POST | `CreateMixSessionUseCase` |
| `mix-session-status` | POST | `GetSessionStatusUseCase` |
| `contact` | POST | `CreateContactTicketUseCase` |
| `health` | GET/POST | `HealthCheckUseCase` |
| `cleanup` | POST | `RunCleanupUseCase` |

## Environment Variables

| Variable | Where used | Purpose |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | Frontend | API base URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Anon key (public) |
| `SUPABASE_URL` | Edge Functions (injected by Supabase runtime) | DB/API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (injected by Supabase runtime) | Privileged DB access |

**Rules:**
- `VITE_*` variables are public — never put secrets here
- `SUPABASE_SERVICE_ROLE_KEY` must never reach the frontend
- No environment variables are read inside `backend/src/` — only in `_shared/adapters/` via `Deno.env.get()`
