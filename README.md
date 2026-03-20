# ShadowMix

A privacy-focused Bitcoin mixing service.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (src/)                                            │
│  React 18 + TypeScript + Vite                               │
│  Calls Edge Functions exclusively via src/lib/api.ts        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS / Supabase anon key
┌─────────────────────▼───────────────────────────────────────┐
│  Official Backend: Supabase Edge Functions                  │
│  supabase/functions/  (Deno runtime)                        │
│  ├── mix-sessions        POST  Create mixing session        │
│  ├── mix-session-status  POST  Query session status         │
│  ├── contact             POST  Create support ticket        │
│  ├── health              GET   Health check                 │
│  └── cleanup             POST  Expire sessions              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  Domain Library (backend/src/)                              │
│  Pure TypeScript — no HTTP server, no process to start      │
│  Clean Architecture + DDD modules                           │
└─────────────────────────────────────────────────────────────┘
```

**There is one official backend: Supabase Edge Functions.**  
`backend/src/` is a domain library that Edge Functions may import from. It is not a server.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router v6, React Query, Zod |
| Backend (HTTP) | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL |
| Domain Library | TypeScript, Clean Architecture + DDD |
| Package Manager | npm |

## Project Structure

```
round1/
├── src/                      # React frontend
│   ├── components/           # UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   ├── api.ts            # Edge Function client (single integration point)
│   │   ├── constants.ts      # Application constants
│   │   ├── utils.ts          # Utility functions
│   │   └── validation.ts     # Zod validation schemas
│   ├── pages/                # Page components
│   └── integrations/supabase/ # Supabase client
├── supabase/                 # Official backend
│   ├── functions/            # Edge Functions (Deno — the HTTP runtime)
│   │   ├── _shared/          # Shared utilities (rate-limiter, logger, headers)
│   │   ├── mix-sessions/     # POST /functions/v1/mix-sessions
│   │   ├── mix-session-status/ # POST /functions/v1/mix-session-status
│   │   ├── contact/          # POST /functions/v1/contact
│   │   ├── health/           # GET  /functions/v1/health
│   │   └── cleanup/          # POST /functions/v1/cleanup
│   └── migrations/           # PostgreSQL migrations
├── backend/                  # Domain library (NO HTTP server)
│   └── src/
│       ├── modules/          # DDD modules (address-generator, blockchain-monitor, etc.)
│       ├── shared/           # Shared kernel
│       └── infra/            # In-memory implementations
├── docs/                     # Architecture and API documentation
│   ├── architecture.md       # System architecture
│   ├── api-contract.md       # API contract for Edge Functions
│   └── SECURITY.md           # Security guidelines
└── .env.example              # Environment variable template (copy to .env)
```

## Development

### Prerequisites

- Node.js 18+
- npm
- Supabase CLI (for Edge Functions: `npm install -g supabase`)

### Getting Started

```bash
# 1. Install frontend dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and fill in your Supabase project credentials

# 3. Start frontend development server
npm run dev

# 4. Start Edge Functions locally (separate terminal)
supabase start
supabase functions serve
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project details:

```
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-public-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>
```

**Never commit `.env` to version control.** The `.gitignore` already excludes it.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `supabase functions serve` | Serve Edge Functions locally |
| `supabase db push` | Apply migrations |

## API

All HTTP endpoints are Supabase Edge Functions. See [`docs/api-contract.md`](docs/api-contract.md) for the full contract.

Base URL: `{SUPABASE_URL}/functions/v1/{function-name}`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/mix-sessions` | POST | Create mixing session |
| `/functions/v1/mix-session-status` | POST | Query session status |
| `/functions/v1/contact` | POST | Create support ticket |
| `/functions/v1/health` | GET | Health check |
| `/functions/v1/cleanup` | POST | Expire sessions (maintenance) |

## Deployment

1. **Frontend**: Deploy via Lovable (Share → Publish) or any static host.
2. **Edge Functions**: `supabase functions deploy`
3. **Database**: `supabase db push`

## Security

- Input validation via Zod (frontend) and manual validation (Edge Functions)
- Rate limiting per IP on all write endpoints
- Security headers on all Edge Function responses
- No secrets committed to the repository
- See [`docs/SECURITY.md`](docs/SECURITY.md) for details

## Architecture Documentation

- [`docs/architecture.md`](docs/architecture.md) — Full architecture diagram and module descriptions
- [`docs/api-contract.md`](docs/api-contract.md) — API contracts and error formats
- [`backend/README.md`](backend/README.md) — Domain library structure

## License

Proprietary. All rights reserved.

