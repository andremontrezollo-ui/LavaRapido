# ShadowMix

A privacy-focused Bitcoin mixing service built with React, TypeScript, and Supabase Edge Functions.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (src/)                                        │
│  React SPA — UI only, no business logic                 │
│  Calls supabase/functions/* via fetch                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────────────────┐
│  supabase/functions/   (Edge Functions — HTTP adapters) │
│  mix-sessions · mix-session-status · contact            │
│  health · cleanup                                       │
│  _shared/: security-headers, error-response, logger     │
│  _shared/adapters/: Supabase repository implementations │
└────────────────────┬────────────────────────────────────┘
                     │ imports
┌────────────────────▼────────────────────────────────────┐
│  backend/src/          (Domain + Application core)      │
│  modules/: mix-session · contact · health · cleanup     │
│  shared/: errors · ports · utils · logging · policies   │
└─────────────────────────────────────────────────────────┘
```

### Layer responsibilities

| Layer | Responsibility |
|-------|---------------|
| `src/` (frontend) | UI rendering, form handling, calling the API |
| `supabase/functions/` | HTTP parsing, auth/rate-limit at edge, calling use cases, serialising responses |
| `backend/src/` | Domain entities, use cases, port interfaces — **no HTTP, no Deno-specific code** |

**Rule:** Business logic lives exclusively in `backend/src/`. Edge Functions are thin adapters only.

## Project Structure

```
.
├── src/                        # React SPA
│   ├── components/             # UI components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # constants, validation, utils, API client
│   └── pages/                  # Route pages
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/            # Shared HTTP utilities + Supabase adapters
│   │   │   ├── adapters/       # Supabase implementations of backend ports
│   │   │   ├── security-headers.ts
│   │   │   ├── error-response.ts
│   │   │   ├── structured-logger.ts
│   │   │   └── rate-limiter.ts
│   │   ├── mix-sessions/       # POST — create mixing session
│   │   ├── mix-session-status/ # POST — query session status
│   │   ├── contact/            # POST — create support ticket
│   │   ├── health/             # GET/POST — health check
│   │   ├── cleanup/            # POST — expire sessions / prune rate limits
│   │   └── tests/              # Integration tests (requires live Supabase)
│   └── migrations/             # SQL schema migrations
│
├── backend/
│   └── src/
│       ├── modules/            # Domain modules (mix-session, contact, health, cleanup)
│       └── shared/             # Shared ports, errors, utils, logging
│
└── docs/                       # Architecture and API contract documentation
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Query, Zod
- **Backend logic**: Pure TypeScript (Deno-compatible, no runtime dependencies)
- **API runtime**: Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL)

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A [Supabase](https://supabase.com) project

### Frontend

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type-check
npm run typecheck

# Lint
npm run lint
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

See `.env.example` for full details.  
**Never commit `.env` to source control.**

### Edge Functions (local development)

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Set secrets for local run
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
```

### Running integration tests

The `supabase/functions/tests/` suite tests the live API.  
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your environment, then:

```bash
deno test --allow-net --allow-env supabase/functions/tests/index.test.ts
```

## Security

- `.env` is git-ignored — never commit real secrets
- Service role key is only used inside Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`), never in the frontend
- All inputs are validated and sanitised in `backend/src/modules/*/application/use-cases/`
- Rate limiting is enforced per IP-hash at the Edge Function level
- All logs redact Bitcoin addresses, IPs, emails, and JWTs before emission

## API Contract

See [`docs/api-contract.md`](docs/api-contract.md) for the full API reference.

## License

Proprietary. All rights reserved.
