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
src/
├── components/
│   ├── home/           # Homepage sections
│   ├── layout/         # Layout components (Header, Footer, Layout)
│   ├── mixing/         # Mixing flow components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configuration
│   ├── constants.ts    # Application constants
│   ├── utils.ts        # Utility functions
│   └── validation.ts   # Input validation schemas
├── pages/              # Page components
└── test/               # Test configuration
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

This project does not require any environment variables for frontend operation. All configuration is handled through `src/lib/constants.ts`.

For backend functionality (when implemented via Lovable Cloud):
- API keys and secrets should be stored in Lovable Cloud secrets
- Never commit secrets to the repository

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

The project follows these architectural principles:

- **Backend = Única Fonte de Verdade**: `backend/src` contains all domain entities, use cases, and business rules
- **Edge Functions = HTTP Adapter Only**: `supabase/functions` contain thin wrappers that parse requests and delegate to use cases
- **Separation of Responsibilities**: Each module has a single purpose
- **Low Coupling / High Cohesion**: Components communicate through well-defined interfaces (ports)
- **Privacy by Architecture**: Minimal data collection and segregated contexts
- **Security by Design**: Defense in depth, no secrets in application code
- **Controlled Auditability**: Privacy-preserving logging

### Where Business Logic Lives

```
backend/src/
  modules/
    mix-session/     ← session creation, expiry, cleanup rules
    contact/         ← ticket validation, sanitization, rate limits
    health/          ← health check response
  infra/persistence/supabase/  ← Supabase adapters (repositories)
  bootstrap/container.ts       ← dependency injection wiring
```

See [`docs/architecture.md`](docs/architecture.md) for the full architecture diagram.

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
