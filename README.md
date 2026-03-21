# ShadowMix

A privacy-focused Bitcoin mixing service built with React, TypeScript, and Tailwind CSS.

## Project Overview

ShadowMix is a web application that provides Bitcoin transaction privacy services through a mixing mechanism that breaks the link between input and output addresses.

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Form Validation**: Zod
- **Backend Runtime**: Supabase Edge Functions (Deno)

## Architecture

```
src/
├── contracts/          # Canonical API types (MixSessionRequest/Response, etc.)
├── services/           # backend-client.ts — sole entry point for all backend calls
├── features/
│   └── mixing/
│       ├── domain/         # Pure business rules (validation, address redistribution)
│       ├── application/    # State machine / use-case orchestration
│       ├── infrastructure/ # I/O boundary (calls backend-client)
│       └── ui/             # Component barrel
├── components/
│   ├── home/           # Homepage sections
│   ├── layout/         # Layout components (Header, Footer, Layout)
│   ├── mixing/         # Shared mixing UI components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configuration
│   ├── constants.ts    # Application constants
│   ├── utils.ts        # Utility functions
│   └── validation.ts   # Input validation schemas
├── pages/              # Page components (UI orchestrators only, no business logic)
└── test/
    ├── fixtures/       # Mock generators for tests (never imported in production code)
    └── *.test.ts       # Unit tests

supabase/
├── functions/
│   ├── _shared/
│   │   ├── core/       # Canonical shared utilities (rate-limiter, logger, headers, errors)
│   │   └── *.ts        # Re-export shims (backward compatibility)
│   ├── mix-sessions/   # POST — create mixing session
│   ├── mix-session-status/ # POST — query session status
│   ├── contact/        # POST — submit support ticket
│   ├── health/         # GET  — health check
│   └── cleanup/        # POST — expire sessions & prune rate limits
└── migrations/         # Database migrations

experimental/
└── backend-legacy/     # Isolated domain library (NOT a runtime, NOT deployed)
                        # Preserved for architectural reference only.
```

### Backend

The **sole HTTP runtime** is Supabase Edge Functions (`supabase/functions/`).
There is no separate Node.js server. The `experimental/backend-legacy/` folder
contains a domain library kept for reference purposes — it is **not deployed**.

### API Contract

All type contracts live in `src/contracts/`.  Never define API types inline in
components or pages.  See `docs/api-contract.md` for the full endpoint reference.

### Frontend Layers

| Layer | Location | Rule |
|-------|----------|------|
| **Domain** | `src/features/*/domain/` | Pure functions — no I/O |
| **Application** | `src/features/*/application/` | State transitions — no React |
| **Infrastructure** | `src/features/*/infrastructure/` | Calls `backend-client.ts` |
| **UI** | `src/pages/`, `src/components/` | React only — no business logic |

## Development

### Prerequisites

- Node.js 18+
- npm

### Getting Started

```bash
npm install
npm run dev        # Start development server
npm run build      # Production build
npm test           # Run unit tests
npm run typecheck  # Type-check without emitting
npm run lint       # Lint
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

All API calls are routed through `src/services/backend-client.ts`.  Never access
`VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` outside that file.

## Security

- Input validation via Zod (contact form) and custom validators (Bitcoin addresses)
- Server-side rate limiting: 10 requests / 10 minutes per IP (mix-sessions endpoint)
- Privacy-preserving structured logs (BTC addresses and IPs are redacted at log time)
- Security headers applied to every Edge Function response
- No secrets committed to source code

## Documentation

- `docs/api-contract.md` — API endpoint reference
- `docs/architecture.md` — System architecture and module diagram
- `docs/SECURITY.md` — Security considerations
