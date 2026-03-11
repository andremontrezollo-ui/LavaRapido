# LavaRapido Backend — Security Model

> **Related:** [Architecture](./architecture.md) · [Hardening Architecture](./hardening-architecture.md) · [Observability](./observability.md)

---

## Overview

LavaRapido implements a layered security model: authentication, authorization, rate limiting, replay protection, idempotency, and log redaction. Each layer is independently enforced and fails closed.

---

## Authentication

**Source:** [`backend/src/api/middlewares/auth.middleware.ts`](../src/api/middlewares/auth.middleware.ts)

`AuthMiddleware` validates inbound requests using Bearer token authentication:

### Service Role Authentication

```
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

The token is compared against `SUPABASE_SERVICE_ROLE_KEY` using **constant-time comparison** to prevent timing attacks:

```typescript
private constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
```

On success, the request receives `scope: 'service'`.

### Anonymous Key Authentication

```
Authorization: Bearer <SUPABASE_ANON_KEY>
```

Compared against `SUPABASE_ANON_KEY` with the same constant-time comparison. On success, the request receives `scope: 'anon'`.

### Failure Behavior

- Missing `Authorization` header → `401 Unauthorized`, reason: `Missing Authorization header`
- Invalid format (not `Bearer <token>`) → `401 Unauthorized`
- Token mismatch → `401 Unauthorized`, reason: `Invalid credentials` (logged at `warn` level without revealing the submitted token)

---

## Authorization

**Source:** [`backend/src/api/middlewares/authorization.middleware.ts`](../src/api/middlewares/authorization.middleware.ts)

`AuthorizationMiddleware` enforces scope-based access control. Each endpoint has a declared set of permitted scopes:

| Endpoint | Permitted Scopes |
|----------|-----------------|
| `POST /api/v1/mix-sessions` | `anon`, `service` |
| `GET /api/v1/mix-sessions/status` | `anon`, `service` |
| `POST /api/v1/contact` | `anon`, `service` |
| `GET /api/v1/health` | `anon`, `service` |
| `POST /api/v1/admin/cleanup` | `service`, `admin` |
| `GET /api/v1/admin/pool-health` | `service`, `admin` |
| `POST /api/v1/admin/rebalance` | `service`, `admin` |

Endpoints not listed in the policy default to requiring `service` or `admin` scope.

### Failure Behavior

- Scope not authorized for the endpoint → `403 Forbidden`, reason includes endpoint key
- No policy defined for endpoint + scope is `anon` → `403 Forbidden`

---

## Rate Limiting

**Source:** [`backend/src/api/middlewares/rate-limit.middleware.ts`](../src/api/middlewares/rate-limit.middleware.ts)

`RateLimitMiddleware` enforces per-IP per-endpoint rate limits using a sliding window counter.

### Configuration

| Parameter | Environment Variable | Default |
|-----------|---------------------|---------|
| Max requests | `RATE_LIMIT_MAX_REQUESTS` | 10 |
| Window | `RATE_LIMIT_WINDOW_MINUTES` | 10 minutes (600 seconds) |

### Implementation

Rate limit keys are formatted as `rate:{endpoint}:{ipHash}`. The IP is hashed before use as a key to avoid storing raw IPs.

**In-memory store:** `InMemoryRateLimitStore` (single-instance only)  
**Redis store:** [`infra/rate-limit/redis-rate-limit-store.ts`](../src/infra/rate-limit/redis-rate-limit-store.ts) (available for production use)

### Failure Behavior

- Limit exceeded → `429 Too Many Requests` with `Retry-After` header
- `RateLimitResult.remaining` is returned for compliant requests

---

## Replay Protection

**Source:** [`backend/src/shared/events/inbox-message.ts`](../src/shared/events/inbox-message.ts)  
**Implementation:** [`backend/src/infra/persistence/inbox.store.ts`](../src/infra/persistence/inbox.store.ts)

`InboxStore` prevents duplicate event handler execution by tracking processed `(eventId, handlerName)` pairs.

### Flow

```
EventBus.publish(event)
  │
  ├─ for each handler:
  │     1. inbox.exists(eventId, handlerName) → if true: skip (already processed)
  │     2. handler.handle(event)
  │     3. inbox.save({ eventId, handlerName, processedAt })
  └─ on failure: retry with backoff; after maxRetries → DLQ
```

### Current Limitation

The `InboxStore` is in-memory. After a process restart, deduplication history is lost. For production deployments with restart risk, back the inbox store with a Supabase table.

---

## Idempotency

**Source:** [`backend/src/shared/policies/idempotency-policy.ts`](../src/shared/policies/idempotency-policy.ts)  
**Implementation:** [`backend/src/infra/persistence/idempotency.store.ts`](../src/infra/persistence/idempotency.store.ts)

`IdempotencyGuard` ensures critical operations execute **at most once** per key within a TTL window.

### Idempotency Keys

| Use Case | Key Format | TTL |
|----------|-----------|-----|
| `ConfirmDepositUseCase` | `confirm-deposit:{txId}:{confirmations}` | 3600s |
| `AllocateLiquidityUseCase` | `allocate:{allocationId}` | 3600s |
| `SchedulePaymentUseCase` | `schedule:{destination}:{amount}:{delay}` | 3600s |
| `MarkPaymentExecutedUseCase` | `execute-payment:{paymentId}` | 3600s |

### Behavior

- On first call: executes operation, stores serialized result with TTL
- On repeat call (within TTL): returns cached result without re-executing
- After TTL expiry: record is deleted; operation may re-execute if called again

### Replay Protection Policy

**Source:** [`backend/src/shared/policies/replay-protection-policy.ts`](../src/shared/policies/replay-protection-policy.ts)

A higher-level policy that combines inbox deduplication with idempotency to provide end-to-end replay protection for event-driven command processing.

---

## Log Redaction

**Source:** [`backend/src/shared/logging/redaction-policy.ts`](../src/shared/logging/redaction-policy.ts)  
**Logger:** [`backend/src/shared/logging/logger.ts`](../src/shared/logging/logger.ts)

`DefaultRedactionPolicy` is applied by `SecureLogger` to every log entry before emission. See [Observability — Log Redaction](./observability.md#log-redaction) for full details.

**Key guarantee:** No Bitcoin addresses, IP addresses, transaction IDs, JWT tokens, or fields named with sensitive keywords will ever appear in log output.

---

## Security Headers

**Source:** [`backend/src/infra/security/SecurityHeaders.ts`](../src/infra/security/SecurityHeaders.ts)

The following HTTP security headers are applied to all responses:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Restrictive CSP preventing XSS |
| `Strict-Transport-Security` | HSTS with `max-age` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |

---

## Input Validation

**Source:** [`backend/src/api/schemas/validation.schemas.ts`](../src/api/schemas/validation.schemas.ts)

All request bodies are validated against Zod schemas before reaching use cases. Invalid inputs are rejected with `400 Bad Request` and a structured error message. Schema validation is performed in [`api/validators/index.ts`](../src/api/validators/index.ts).

---

## Configuration Security

**Source:** [`backend/src/shared/config/env.schema.ts`](../src/shared/config/env.schema.ts)

- All required secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are read from environment variables only
- No secrets are present in the codebase
- Missing required variables cause immediate startup failure (fail-fast)
- Config values are typed via `AppConfig` interface — no raw `process.env` access outside `loadConfig()`

---

## Security Layer Summary

| Layer | Implementation | Status |
|-------|---------------|--------|
| Authentication | `AuthMiddleware` (constant-time token comparison) | ✅ Implemented |
| Authorization | `AuthorizationMiddleware` (scope-based per endpoint) | ✅ Implemented |
| Rate Limiting | `RateLimitMiddleware` (per-IP per-endpoint) | ✅ Implemented |
| Replay Protection | `InboxStore` deduplication | ✅ Implemented (in-memory) |
| Idempotency | `IdempotencyGuard` with TTL | ✅ Implemented (in-memory) |
| Log Redaction | `DefaultRedactionPolicy` | ✅ Implemented |
| Security Headers | `SecurityHeaders` | ✅ Implemented |
| Input Validation | Zod schema validation | ✅ Implemented |
| Secrets Management | Environment variables only | ✅ Implemented |
| TLS/HTTPS | Handled by hosting platform | 🔧 Platform responsibility |
| Secret rotation | Manual | 🔧 Operational procedure |
