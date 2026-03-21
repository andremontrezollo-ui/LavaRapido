# Hardened Backend Architecture

## Overview

The ShadowMix backend follows **Clean Architecture** with **DDD** per module, enforcing strict layer boundaries: `domain → application → infrastructure → interfaces`.

## Architecture Layers

```
backend/src/
├── api/              # Interface layer: controllers, middlewares, schemas, security
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

| Layer | Implementation |
|-------|---------------|
| Authentication | `AuthMiddleware` — service-role/anon key validation with constant-time comparison |
| Authorization | `AuthorizationMiddleware` — scope-based access per endpoint |
| Rate Limiting | `RateLimitMiddleware` — per IP+endpoint with configurable window |
| Correlation | `CorrelationIdMiddleware` — propagates or generates correlation IDs |
| Logging | `RequestLoggingMiddleware` — structured, redacted request/response logs |
| Errors | `ErrorHandler` — maps domain errors to safe HTTP responses |
| Validation | Schema-based DTO validation with sanitization |
| Headers | Security headers: CSP, HSTS, X-Frame-Options, etc. |

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
