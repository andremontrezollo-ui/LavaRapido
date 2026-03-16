# BankRound1 — Bitcoin Privacy Concept Simulator

> ⚠️ **This is an educational prototype / laboratory / simulator.**
> It does **not** perform real Bitcoin transactions, does not connect to any blockchain,
> and does not hold or move any real funds. Addresses shown are testnet mocks only.

An interactive prototype that illustrates Bitcoin address-dissociation concepts —
built with React, TypeScript, Tailwind CSS, and Supabase Edge Functions.

## Project Overview

BankRound1 is a conceptual simulator that lets you explore what a mixing-style
transaction privacy interface might look like, without executing any real financial
operations. The backend stores only minimal session metadata for demonstration purposes.

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Form Validation**: Zod
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL (with RLS)
- **Package Manager**: npm (`package-lock.json` is the canonical lock file)

## Project Structure

```
src/
├── components/
│   ├── home/           # Homepage sections
│   ├── layout/         # Layout components (Header, Footer, Layout)
│   ├── mixing/         # Mixing flow components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configuration
│   ├── api.ts          # Edge Function API client
│   ├── constants.ts    # Application constants
│   ├── mock-session.ts # Simulator session types
│   ├── utils.ts        # Utility functions
│   └── validation.ts   # Input validation schemas
├── pages/              # Page components
└── test/               # Test configuration
supabase/
├── functions/          # Edge Functions (Deno)
│   ├── _shared/        # Shared utilities (headers, rate limiter, logger)
│   ├── cleanup/        # Periodic data retention job
│   ├── contact/        # Contact form handler
│   ├── health/         # Health check
│   ├── mix-session-status/ # Status lookup via opaque token
│   └── mix-sessions/   # Session creation
└── migrations/         # PostgreSQL migrations
docs/
├── data-retention.md   # Data retention policy
└── remediation_report.md  # Security audit report
```

## Development

### Prerequisites

- Node.js 18+ and npm (canonical package manager for this project)
- Supabase CLI (for local Supabase development)

### Getting Started

```bash
# Install dependencies (uses npm — do not use bun/yarn to avoid lockfile conflicts)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project details:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (from Project Settings → API) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key |

The app will display a clear error message at startup if any required variable is missing.

### Supabase Edge Function Variables

When deploying Edge Functions, set the following secrets via `supabase secrets set`:

| Variable | Description |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (auto-injected by Supabase runtime) |
| `RATE_LIMIT_HMAC_SECRET` | Strong random secret for IP pseudonymisation (HMAC-SHA256) |
| `ALLOWED_ORIGIN` | Comma-separated list of allowed frontend origins for CORS |

### Running Supabase Locally

```bash
# Start local Supabase stack
npx supabase start

# Apply migrations
npx supabase db push

# Run Edge Functions locally
npx supabase functions serve

# Stop local stack
npx supabase stop
```

### Running Against Remote Supabase

```bash
# Link to your project
npx supabase link --project-ref <your-project-ref>

# Push migrations
npx supabase db push

# Deploy functions
npx supabase functions deploy
```

## Security Considerations

### Input Validation

All user inputs are validated using Zod schemas:
- Bitcoin addresses are validated against standard patterns (Legacy, P2SH, Bech32, Bech32m)
- Contact form inputs are sanitized and length-limited
- Edge Functions validate all incoming payloads

### RLS (Row Level Security)

- All tables have RLS enabled
- `mix_sessions`: no public SELECT; all reads are mediated by Edge Functions using service role
- `rate_limits` and `contact_tickets`: no public access
- Status lookups use an opaque `public_status_token` — the internal UUID is never exposed

### CORS

- `Access-Control-Allow-Origin` is restricted to origins listed in the `ALLOWED_ORIGIN` env var
- No wildcard (`*`) CORS in Edge Functions

### Privacy

- IP addresses are never stored in plain text
- HMAC-SHA256 with a server secret (`RATE_LIMIT_HMAC_SECRET`) is used to pseudonymise IPs
- All demo data is deleted within 24 hours (see `docs/data-retention.md`)

### Package Manager

This project uses **npm** as the canonical package manager. The `package-lock.json` is the
authoritative lockfile. The `bun.lock` and `bun.lockb` files are excluded from version
control (see `.gitignore`).

## Demo Disclaimer

This application is **strictly a demo / laboratory / educational prototype**.

- ❌ No real Bitcoin transactions are performed
- ❌ No funds are held, mixed, or moved
- ❌ No blockchain connectivity
- ✅ Testnet mock addresses only
- ✅ All session data deleted within 24 hours

**Do not send real BTC to any address displayed by this application.**

## Deployment

The application can be deployed via Lovable's publish feature or any static hosting service.
Supabase Edge Functions are deployed via the Supabase CLI.

## Architecture Principles

- **Privacy by Design**: Minimal data collection, short retention, no PII storage
- **Least Privilege**: RLS policies restrict data access; Edge Functions use service role
- **Transparency**: Clear demo/simulator framing throughout the UI and documentation
- **Security by Default**: HMAC pseudonymisation, opaque tokens, restricted CORS

## Contributing

1. Follow the existing code style and conventions
2. Add proper TypeScript types
3. Validate all user inputs
4. Use semantic design tokens from the design system
5. Write meaningful commit messages
6. Maintain the "demo only" framing — do not add real financial functionality

## License

This project is proprietary. All rights reserved.

