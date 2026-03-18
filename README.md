# Welcome to ShadowMix

A privacy-focused Bitcoin mixing service built with React, TypeScript, and Tailwind CSS.

## Project Overview

ShadowMix is a web application that provides Bitcoin transaction privacy services through a mixing mechanism that breaks the link between input and output addresses.

---

## Architecture at a Glance

```
Frontend (React/Vite)
        │ HTTP
        ▼
Supabase Edge Functions   ← thin HTTP adapters (Deno)
   supabase/functions/
        │ delegates to
        ▼
_shared/container.ts      ← Supabase-specific infrastructure
        │ implements
        ▼
backend/src/modules/      ← canonical business logic (use cases, domain)
```

### Key Principles

| Layer | What lives here |
|-------|----------------|
| `backend/src/modules/` | Domain entities, use cases, port interfaces (business core) |
| `backend/src/bootstrap/` | Dependency container for Node.js runtime |
| `backend/src/api/contracts/` | Stable HTTP request/response shapes |
| `backend/src/api/presenters/` | Map use-case DTOs to HTTP contracts |
| `supabase/functions/_shared/container.ts` | Supabase-backed use-case wiring |
| `supabase/functions/*/index.ts` | Thin HTTP adapters — no business logic |

See [`docs/architecture.md`](./docs/architecture.md) for the full architecture reference.

---

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Form Validation**: Zod
- **Backend Runtime**: Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL)

---

## Project Structure

```
.
├── src/                          # Frontend (React/Vite)
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── pages/
│
├── backend/                      # Business core (Node.js / TypeScript)
│   └── src/
│       ├── bootstrap/            # Dependency container + config
│       ├── modules/
│       │   ├── mix-session/      # CreateMixSession, GetMixSessionStatus, CleanupExpiredSessions
│       │   ├── contact/          # SubmitContactMessage
│       │   ├── health/           # GetSystemHealth
│       │   ├── address-generator/
│       │   ├── blockchain-monitor/
│       │   ├── liquidity-pool/
│       │   ├── log-minimizer/
│       │   └── payment-scheduler/
│       ├── api/
│       │   ├── contracts/        # Stable HTTP types
│       │   └── presenters/       # DTO → HTTP response mappers
│       ├── infra/                # Infrastructure adapters
│       └── shared/               # Shared kernel (events, ports, policies)
│
├── supabase/
│   └── functions/                # Edge Functions (Deno)
│       ├── _shared/
│       │   ├── container.ts      # Supabase-backed use-case wiring
│       │   ├── bootstrap.ts      # Supabase client singleton
│       │   ├── cors.ts
│       │   ├── auth.ts
│       │   ├── request.ts
│       │   ├── response.ts
│       │   ├── errors.ts
│       │   └── telemetry.ts
│       ├── mix-sessions/         # POST → createMixSession
│       ├── mix-session-status/   # POST → getMixSessionStatus
│       ├── contact/              # POST → submitContactMessage
│       ├── health/               # GET/POST → getSystemHealth
│       ├── cleanup/              # POST → cleanupExpiredSessions
│       └── tests/                # Integration tests
│
└── docs/
    ├── architecture.md
    └── api-contract.md
```

---

## Request Flow

```
1. Browser  →  POST /functions/v1/mix-sessions
2. Edge Function (mix-sessions/index.ts)
   a. CORS preflight check
   b. Method validation
   c. Extract client IP, hash it
   d. Rate limit check (via container)
   e. Call container.createMixSession({ clientFingerprintHash })
3. _shared/container.ts (createMixSession)
   a. Generate testnet deposit address
   b. Calculate session expiry (30 min)
   c. Insert into mix_sessions table (Supabase)
   d. Return session data
4. Edge Function formats and returns JSON response
```

---

## Development

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for running Edge Functions locally)

### Getting Started

```bash
# Install frontend dependencies
npm install

# Start frontend development server
npm run dev

# Build for production
npm run build

# Run frontend tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Running Edge Functions Locally

```bash
# Start Supabase local stack (requires Docker)
supabase start

# Serve Edge Functions
supabase functions serve

# Run integration tests (requires local Supabase running)
cd supabase/functions
deno test --allow-net --allow-env tests/index.test.ts
```

### Environment Variables

#### Frontend
No environment variables required for frontend-only operation. Configuration is in `src/lib/constants.ts`.

#### Backend (Supabase Edge Functions)
These are automatically injected by the Supabase runtime:
```
SUPABASE_URL               # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY  # Service role key (never expose to frontend)
```

For local development, create a `.env` file in `supabase/functions/tests/` with:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase status>
```

---

## Security Considerations

- ✅ No hardcoded secrets in codebase
- ✅ Input sanitization and validation (backend + edge layer)
- ✅ Rate limiting per IP (hashed, never stored raw)
- ✅ Privacy-preserving logging (BTC addresses, IPs, emails redacted)
- ✅ Security headers on all responses (CSP, HSTS, X-Frame-Options, etc.)
- ✅ XSS prevention through React's built-in escaping
- ✅ Edge Functions contain no business logic (minimal attack surface)

---

## Architecture Principles

- **Clean Architecture**: Domain → Application → Infrastructure → API/Edge Functions
- **Separation of Responsibilities**: Each module has a single purpose
- **Low Coupling / High Cohesion**: Modules communicate through well-defined interfaces (ports)
- **Privacy by Architecture**: Minimal data collection, segregated contexts, log redaction
- **Security by Design**: Defence in depth, no secrets in code, rate limiting, input validation
- **Controlled Auditability**: Privacy-preserving structured logging

---

## Contributing

1. Follow the existing code style and conventions
2. Add proper TypeScript types
3. Validate all user inputs at the edge layer
4. Keep business logic in `backend/src/modules/`
5. Keep Edge Functions as thin HTTP adapters
6. Write meaningful commit messages

## License

This project is proprietary. All rights reserved.
