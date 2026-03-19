# ShadowMix Backend — Security and Hardening

## Overview

The ShadowMix backend follows **Clean Architecture** with strict layer boundaries.

```
backend/src/
├── modules/           # Domain modules (mix-session, contact, health, cleanup)
└── shared/            # Shared kernel: errors, ports, utils, logging, policies
```

## Input Validation

All user-facing inputs are validated inside use cases before any persistence:

- `CreateContactTicketUseCase` enforces subject (3–100 chars), message (10–2000 chars), replyContact (≤500 chars)
- `GetSessionStatusUseCase` accepts only valid UUIDs (validated at the Edge Function level)
- All string inputs are sanitised via `shared/utils/sanitize.ts` before storage

## Privacy-Preserving Logging

The `shared/logging/logger.ts` (`SecureLogger`) applies `DefaultRedactionPolicy` before emitting any log:

- Bitcoin addresses (`[BTC_ADDR]` / `[BTC_BECH32]`)
- IPv4 addresses (`[IP_REDACTED]`)
- SHA-256 hex hashes (`[HASH_REDACTED]`)
- JWT tokens (`[JWT_REDACTED]`)
- Fields with sensitive names (`password`, `secret`, `token`, `key`, etc.)

The `supabase/functions/_shared/structured-logger.ts` applies equivalent redaction rules.

## Rate Limiting

Rate limits are enforced per IP-hash at the Edge Function level:

| Endpoint | Limit |
|----------|-------|
| `mix-sessions` | 10 requests / 10 minutes |
| `contact` | 5 requests / 10 minutes |

The actual IP is never stored — only its SHA-256 hash.

## Secrets Management

- `SUPABASE_SERVICE_ROLE_KEY` is used only inside Edge Functions, injected by the Supabase runtime.
- No secrets are hardcoded in source code.
- `.env` is git-ignored; `.env.example` provides safe placeholder documentation.
- The frontend uses only the public anon key (`VITE_SUPABASE_PUBLISHABLE_KEY`), which carries no privileged access.

## Dependency Rules

- `domain/` imports nothing external — pure TypeScript.
- `application/` imports only `domain/` and `shared/` port interfaces.
- Supabase SDK is used only in `supabase/functions/_shared/adapters/` — never inside `backend/src/`.
