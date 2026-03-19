# ShadowMix — Backend Core

The `backend/` directory is the **official domain and application core** of ShadowMix.

It is a pure TypeScript library — no HTTP server, no runtime-specific dependencies — that encapsulates all business logic for the system.  
It is consumed by `supabase/functions/*` as the single source of truth.

## Module Structure

```
backend/src/
├── modules/
│   ├── mix-session/    # Create sessions, query status
│   ├── contact/        # Support ticket creation and validation
│   ├── health/         # Health check use case
│   └── cleanup/        # Expire sessions, prune rate limits
└── shared/
    ├── errors/         # DomainError base class
    ├── ports/          # Repository and service port interfaces
    ├── utils/          # id-generator, hash, sanitize
    ├── logging/        # Secure structured logger (redaction)
    └── policies/       # Policy base interfaces
```

Each module follows a two-layer architecture:

```
module/
├── domain/       # Entities, errors — pure logic, no I/O
└── application/  # Use cases, ports (interfaces), DTOs
```

## Design Rules

| Layer | May import |
|-------|-----------|
| `domain/` | Nothing external |
| `application/` | `domain/`, `shared/` (ports and utils) |
| `supabase/functions/` | `backend/src` use cases + own infra adapters |

## Shared Utilities

| File | Purpose |
|------|---------|
| `shared/utils/id-generator.ts` | `generateUuid`, `generateMockTestnetAddress`, `generateTicketId`, `generateRequestId` |
| `shared/utils/hash.ts` | `hashString` (SHA-256, Web Crypto) |
| `shared/utils/sanitize.ts` | `sanitizeInput` (strip control chars) |
| `shared/ports/RateLimitRepository.ts` | Port interface for rate limit storage |
| `shared/errors/domain-error.ts` | `DomainError` base class |

## Usage from Edge Functions

```typescript
import { CreateMixSessionUseCase } from "../../../backend/src/modules/mix-session/application/use-cases/create-mix-session.usecase.ts";
import { SupabaseMixSessionRepository } from "../_shared/adapters/mix-session.repository.ts";

const sessions = new SupabaseMixSessionRepository(supabaseClient);
const useCase = new CreateMixSessionUseCase(sessions);
const result = await useCase.execute({ clientFingerprintHash: ipHash });
```

## Environment Variables

The backend core itself has **no environment variable dependencies**.  
Environment variables are injected by the Edge Functions runtime (`Deno.env.get()`).

See `.env.example` at the project root for a complete list.
