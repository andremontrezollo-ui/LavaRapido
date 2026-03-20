# Hardened Backend Architecture

## Overview

The ShadowMix backend follows **Clean Architecture** with **DDD** per module, enforcing strict layer boundaries: `domain → application → infrastructure → interface`.

The **interface/HTTP layer** is implemented exclusively in **Supabase Edge Functions** (`supabase/functions/`).  
`backend/src/` contains only the domain library (shared kernel + modules + infrastructure adapters).

## Architecture Layers

```
supabase/functions/           # Interface layer (Deno Edge Functions — HTTP runtime)
├── mix-sessions/index.ts     # POST /mix-sessions
├── mix-session-status/index.ts
├── contact/index.ts
├── health/index.ts
├── cleanup/index.ts
└── _shared/                  # Shared HTTP utilities (security headers, rate limiter, logger)

backend/src/                  # Domain library (imported by Edge Functions)
├── infra/            # Infrastructure: persistence, messaging, locks, saga, scheduler
├── shared/           # Shared kernel: events, http, ports, policies, config, logging
└── modules/          # Domain modules (bounded contexts)
    ├── address-generator/
    ├── blockchain-monitor/
    ├── liquidity-pool/
    ├── payment-scheduler/
    ├── log-minimizer/
    └── deposit-saga/
```

## Event Flow

```
blockchain-monitor          liquidity-pool           payment-scheduler
  DEPOSIT_DETECTED ──────────►                        
  DEPOSIT_CONFIRMED ─────────► reserve_liquidity
                              LIQUIDITY_ALLOCATED ───► schedule_payment
                                                      PAYMENT_EXECUTED ──► log-minimizer
```

All events flow through the **ResilientEventBus** with:
- **Retry**: exponential backoff, max 3 attempts
- **DLQ**: failed events are quarantined after max retries
- **Deduplication**: InboxStore prevents duplicate handler execution
- **Correlation IDs**: all events carry `correlationId` for tracing

## Idempotency Strategy

Every critical use case wraps execution in an `IdempotencyGuard`:

```typescript
const result = await idempotencyGuard.executeOnce(key, async () => {
  // This block runs at most once per key
});
```

Applied to:
- `ConfirmDepositUseCase` — key: `confirm-deposit:{txId}:{confirmations}`
- `AllocateLiquidityUseCase` — key: `allocate:{allocationId}`
- `SchedulePaymentUseCase` — key: `schedule:{destination}:{amount}:{delay}`
- `MarkPaymentExecutedUseCase` — key: `execute-payment:{paymentId}`

Records are stored in `IdempotencyStore` with TTL-based expiration.

## Secure Logging

The `SecureLogger` applies `DefaultRedactionPolicy` before any output:

**Blocked patterns:**
- Bitcoin addresses (legacy, P2SH, bech32)
- IP addresses
- 64-char hex hashes (txids, keys)
- JWTs

**Field-level redaction:**
- Fields matching `password`, `secret`, `token`, `key`, `credential`, `mnemonic`, `seed`, etc.
- Values truncated at 200 chars

**Allowed fields (whitelist):**
- `level`, `message`, `timestamp`, `correlationId`, `method`, `path`, `statusCode`, `duration`, `module`, `action`, `step`, `status`, `count`

## Configuration

Centralized via `shared/config`:

```typescript
const config = loadConfig(); // Fails fast if SUPABASE_URL etc. missing
```

- Validates all env vars at startup
- Typed `AppConfig` interface
- Defaults for non-critical values
- No secrets in codebase

## Outbox Pattern

Events are persisted in `OutboxStore` alongside aggregate changes. The `OutboxProcessor` polls for pending messages and publishes them via EventBus:

```
Transaction: save(aggregate) + save(outboxMessage) → commit
Background: OutboxProcessor.processOnce() → publish → markPublished
```

Failed publishes retry with backoff; after 5 failures → dead letter.

## Inbox Pattern

`InboxStore` tracks processed events by `(eventId, handlerName)`:

```
Before handling: if inbox.exists(eventId, handlerName) → skip
After handling: inbox.save(message)
```

## Saga Pattern

The `SagaOrchestrator` coordinates multi-module flows:

```typescript
const steps: SagaStep[] = [
  { name: 'confirm_deposit', execute: ..., compensate: ... },
  { name: 'reserve_liquidity', execute: ..., compensate: ... },
  { name: 'schedule_payments', execute: ..., compensate: ... },
];
await orchestrator.execute('deposit-processing', steps);
```

States: `started → step_completed → completed | compensating → compensated | failed`

## Distributed Locks

`DistributedLock` prevents concurrent execution:
- Payment execution: `payment-exec:{paymentId}`
- Job processing: `job:{jobId}`
- Lock TTL with automatic expiration

## API Security

Security concerns are handled at the Edge Function layer (`supabase/functions/_shared/`):

| Layer | Implementation |
|-------|---------------|
| Authentication | Supabase `apikey` header + service role key via `SUPABASE_SERVICE_ROLE_KEY` |
| Rate Limiting | SHA-256 hashed IP per endpoint with configurable window (`rate-limiter.ts`) |
| Correlation | Request IDs generated per request (`structured-logger.ts`) |
| Logging | Structured, privacy-preserving JSON logs with redaction (`structured-logger.ts`) |
| Errors | Standardized error format — no stack traces exposed (`error-response.ts`) |
| Validation | Zod schemas per endpoint |
| Headers | Security headers: CSP, HSTS, X-Frame-Options, etc. (`security-headers.ts`) |

## Guarantees

- ✅ No in-memory-only state for critical paths
- ✅ Idempotent command processing
- ✅ Replay protection for events
- ✅ Saga compensation on partial failures
- ✅ Distributed locks for concurrent operations
- ✅ No sensitive data in logs
- ✅ Fail-fast configuration validation
- ✅ DLQ for permanently failed events/jobs

## Limitations

- Current persistence is in-memory (suitable for edge function lifecycle)
- Production deployment should back stores with Supabase tables
- Distributed locks are process-local (use Supabase advisory locks for multi-instance)
