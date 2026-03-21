# Welcome to ShadowMix

A privacy-focused Bitcoin mixing service built with React, TypeScript, Tailwind CSS, and Supabase Edge Functions.

## Project Overview

ShadowMix is a web application that provides Bitcoin transaction privacy services through a mixing mechanism that breaks the link between input and output addresses.

## Arquitetura Oficial

| Layer | Technology | Location |
|-------|-----------|----------|
| **Frontend** | React 18 + Vite + TypeScript | `src/` |
| **Backend** | Supabase Edge Functions (Deno) | `supabase/functions/` |
| **Persistence** | Supabase (PostgreSQL + migrations) | `supabase/migrations/` |
| **API Client** | TypeScript fetch wrapper | `src/api/` |
| **Supabase Client** | `@supabase/supabase-js` | `src/integrations/supabase/` |

> **Note**: The `/backend` directory contains domain models and architectural blueprints only.
> It is **not** an executable server and is **not** used by the frontend at runtime.
> See [`backend/README.md`](./backend/README.md) for details.

### Request Flow

```
Browser (React UI)
      │
      ▼
src/services/mixing/   src/services/contact/
  (pure business logic — no React, no I/O)
      │
      ▼
src/api/
  ├── client.ts          (HTTP transport layer)
  ├── endpoints/mix.ts   (mix-sessions, mix-session-status)
  ├── endpoints/contact.ts (contact ticket)
  └── endpoints/health.ts  (health check)
      │
      ▼
Supabase Edge Functions  ({SUPABASE_URL}/functions/v1/...)
  ├── mix-sessions/
  ├── mix-session-status/
  ├── contact/
  ├── health/
  └── cleanup/
      │
      ▼
Supabase PostgreSQL  (mix_sessions, contact_tickets, rate_limits)
```

### Environment Variables

The following environment variables **must** be set for the application to function:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xyz.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |

Create a `.env` file at the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

> Never commit secrets or service-role keys to the repository.

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

## Project Structure

```
src/
├── api/                # HTTP client and endpoint definitions
│   ├── client.ts       # Core fetch wrapper
│   ├── types.ts        # Shared API types
│   └── endpoints/      # Per-domain endpoint functions
│       ├── mix.ts
│       ├── contact.ts
│       └── health.ts
├── services/           # Pure business logic (no React, no I/O)
│   ├── mixing/         # Distribution, validation, payload building
│   └── contact/        # Form validation, payload building
├── components/
│   ├── home/           # Homepage sections
│   ├── layout/         # Layout components (Header, Footer, Layout)
│   ├── mixing/         # Mixing flow UI components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/
│   └── supabase/       # Supabase client and generated types
├── lib/                # Utilities, constants, validation schemas
│   ├── constants.ts    # Application constants
│   ├── utils.ts        # Utility functions
│   └── validation.ts   # Zod validation schemas
├── pages/              # Page components (thin — delegate to services)
└── test/               # Test configuration and test files

supabase/
├── functions/
│   ├── _shared/        # Shared Deno modules (http, infra, validation)
│   ├── mix-sessions/   # Create mix session endpoint
│   ├── mix-session-status/ # Query session status endpoint
│   ├── contact/        # Contact ticket endpoint
│   ├── health/         # Health check endpoint
│   └── cleanup/        # Scheduled cleanup job
├── migrations/         # SQL migration files
└── config.toml

backend/                # ⚠️ Domain library / architectural blueprint only
                        # NOT an HTTP server. NOT used at runtime.
```

## Development

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### Getting Started

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env  # set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

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

## Security Considerations

### Input Validation

All user inputs are validated using Zod schemas:
- Bitcoin addresses are validated against standard patterns (Legacy, P2SH, Bech32, Bech32m)
- Contact form inputs are sanitized and length-limited
- Validation occurs both client-side (services/) and server-side (Edge Functions)

### Best Practices Implemented

- ✅ No hardcoded secrets in codebase
- ✅ Input sanitization and validation (client + server)
- ✅ XSS prevention through React's built-in escaping
- ✅ Secure random ID generation using `crypto.getRandomValues()`
- ✅ Proper TypeScript types for type safety
- ✅ Component-level separation of concerns
- ✅ Rate limiting on all Edge Function endpoints
- ✅ Security headers (CSP, HSTS, X-Frame-Options) on all responses
- ✅ Privacy-preserving structured logging (BTC addresses, IPs redacted)
- ✅ Lazy loading for performance optimization

### Recommendations for Production

1. **Backend Security**: Server-side validation is active in all Edge Functions
2. **Rate Limiting**: Active via `supabase/functions/_shared/infra/rate-limiter.ts`
3. **CSP Headers**: Configured in `supabase/functions/_shared/http/security-headers.ts`
4. **HTTPS**: Enforced by Supabase infrastructure
5. **Monitoring**: Structured JSON logging in all Edge Functions
6. **Auditing**: Regular security audits of dependencies

## Architecture Principles

- **Separation of Responsibilities**: Frontend = UI; services/ = business logic; api/ = transport; Edge Functions = HTTP runtime
- **Single Source of Truth**: Supabase Edge Functions are the sole HTTP runtime
- **Low Coupling / High Cohesion**: Components communicate through well-defined service interfaces
- **Privacy by Architecture**: Minimal data collection, log redaction, segregated contexts
- **Security by Design**: Defense in depth, no secrets in application code
- **Controlled Auditability**: Privacy-preserving logging without user reidentification

## Contributing

When contributing to this project:

1. Follow the existing code style and conventions
2. Add proper TypeScript types
3. Validate all user inputs (both in services/ and Edge Functions)
4. Use semantic design tokens from the design system
5. Write meaningful commit messages
6. Test your changes before submitting

## License

This project is proprietary. All rights reserved.
