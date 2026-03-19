# Welcome to ShadowMix

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

## Project Structure

```
src/                    ← Frontend (React + TypeScript + Vite)
├── components/
│   ├── home/           # Homepage sections
│   ├── layout/         # Layout components (Header, Footer, Layout)
│   ├── mixing/         # Mixing flow components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and API client
│   ├── api.ts          # Edge Function client (HTTP only)
│   ├── constants.ts    # Application constants
│   ├── utils.ts        # Utility functions
│   └── validation.ts   # Input validation schemas
├── pages/              # Page components
└── test/               # Test configuration

supabase/               ← Supabase project (Edge Functions + migrations)
├── functions/
│   ├── mix-sessions/   # POST — create mixing session
│   ├── mix-session-status/ # POST — query session status
│   ├── contact/        # POST — submit support ticket
│   ├── health/         # GET/POST — health check
│   ├── cleanup/        # POST — expire sessions, prune rate limits
│   └── _shared/        # Shared runtime modules (Deno)
│       ├── use-cases/  # Business logic (single source of truth)
│       ├── ports/      # Repository/service interfaces
│       ├── adapters/   # Supabase concrete implementations
│       ├── security-headers.ts
│       ├── error-response.ts
│       ├── structured-logger.ts
│       └── rate-limiter.ts (IP hashing)
└── migrations/         # Database migrations

backend/                ← Domain core (Node.js/TypeScript)
└── src/
    ├── modules/
    │   ├── mix-session/       # Mix session lifecycle domain
    │   ├── contact/           # Contact/support ticket domain
    │   ├── address-generator/ # Unique deposit address tokens
    │   ├── blockchain-monitor/# Blockchain event ingestion
    │   ├── deposit-saga/      # Deposit processing orchestration
    │   ├── liquidity-pool/    # Fund aggregation layer
    │   ├── log-minimizer/     # Privacy-preserving logging
    │   └── payment-scheduler/ # Payment scheduling and batching
    ├── shared/         # Shared kernel (EventBus, ports, Result types)
    ├── infra/          # Infrastructure adapters
    ├── api/            # HTTP controllers and middleware
    └── app/            # Application bootstrap
```

## Development

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### Getting Started

```bash
# Install dependencies
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

**Frontend** (`src/`):
- `VITE_SUPABASE_URL` — Supabase project URL (public)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key (public)

**Edge Functions** (`supabase/functions/`): Automatically injected by Supabase runtime:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Backend** (`backend/`): See `backend/.env.example` for all required variables.
Never commit `.env` files — they are protected by `.gitignore`.

## Security Considerations

### Input Validation

All user inputs are validated using Zod schemas:
- Bitcoin addresses are validated against standard patterns (Legacy, P2SH, Bech32, Bech32m)
- Contact form inputs are sanitized and length-limited
- All validation occurs both client-side and server-side (when backend is implemented)

### Best Practices Implemented

- ✅ No hardcoded secrets in codebase
- ✅ Input sanitization and validation
- ✅ XSS prevention through React's built-in escaping
- ✅ Secure random ID generation using `crypto.getRandomValues()`
- ✅ Proper TypeScript types for type safety
- ✅ Component-level separation of concerns
- ✅ Lazy loading for performance optimization

### Recommendations for Production

1. **Backend Security**: Implement server-side validation for all operations
2. **Rate Limiting**: Add rate limiting for form submissions
3. **CSP Headers**: Configure Content Security Policy headers
4. **HTTPS**: Ensure all traffic is served over HTTPS
5. **Monitoring**: Implement error tracking and monitoring
6. **Auditing**: Regular security audits of dependencies

## Deployment

The application can be deployed via Lovable's publish feature:

1. Open the project in Lovable
2. Click Share → Publish
3. Optionally configure a custom domain

## Architecture Principles

The project follows these architectural principles (documented in `docs/architecture.md`):

- **Single Backend Core**: Business logic lives in `supabase/functions/_shared/use-cases/`; Edge Functions are thin HTTP handlers only
- **Port/Adapter Pattern**: All persistence is abstracted behind interfaces in `_shared/ports/`; Supabase adapters in `_shared/adapters/` are the sole concrete implementations
- **Separation of Responsibilities**: `src/` = frontend; `supabase/functions/` = HTTP entry; `backend/` = domain model
- **Privacy by Architecture**: Minimal data collection, segregated contexts, structured redaction logging
- **Security by Design**: Defense in depth, no secrets in application code, `service_role_key` used only in Edge Functions (server-side)

## Contributing

When contributing to this project:

1. Follow the existing code style and conventions
2. Add proper TypeScript types
3. Validate all user inputs
4. Use semantic design tokens from the design system
5. Write meaningful commit messages
6. Test your changes before submitting

## License

This project is proprietary. All rights reserved.
