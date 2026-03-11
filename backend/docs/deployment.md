# LavaRapido Backend — Deployment Guide

> **Related:** [Architecture](./architecture.md) · [SRE Readiness](./sre-readiness.md) · [Runbooks](./runbooks/)

---

## Overview

This guide covers deploying the LavaRapido backend, including environment configuration, startup order, database initialization, health verification, and rollback procedures.

---

## Environment Variables

**Source:** [`backend/src/shared/config/env.schema.ts`](../src/shared/config/env.schema.ts)

The application validates all required environment variables at startup and exits immediately if any are missing or invalid.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (client-facing) | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (privileged) | `eyJhbGciOi...` |

> ⚠️ **Security:** `SUPABASE_SERVICE_ROLE_KEY` grants full database access. Never expose it to clients. Rotate immediately if compromised.

### Optional Variables

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|-------------|
| `APP_ENV` | Application environment | `development` | `development`, `test`, `production` |
| `LOG_LEVEL` | Minimum log level | `info` | `debug`, `info`, `warn`, `error` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window per IP+endpoint | `10` | Positive integer |
| `RATE_LIMIT_WINDOW_MINUTES` | Rate limit sliding window in minutes | `10` | Positive integer |
| `SESSION_TTL_MINUTES` | Session expiration time in minutes | `60` | Positive integer |
| `CONFIRMATION_THRESHOLD` | Bitcoin block confirmations required | `6` | Positive integer (≥ 1) |
| `OUTBOX_POLL_INTERVAL_MS` | Outbox processor polling interval | `1000` | Positive integer (ms) |
| `MAX_RETRIES` | Event handler max retry attempts | `3` | Positive integer |
| `LOCK_TTL_SECONDS` | Distributed lock TTL in seconds | `30` | Positive integer |

### Environment Configuration Example

```bash
# .env (never commit to version control)
APP_ENV=production
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LOG_LEVEL=info
CONFIRMATION_THRESHOLD=6
OUTBOX_POLL_INTERVAL_MS=2000
MAX_RETRIES=3
LOCK_TTL_SECONDS=30
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MINUTES=10
```

---

## Startup Order

The application follows a deterministic startup sequence to ensure all dependencies are available before accepting traffic.

```
1. Load and validate environment variables
   └── loadConfig() in backend/src/shared/config/load-config.ts
   └── Exits immediately on validation failure

2. Initialize database connection
   └── backend/src/infra/database/connection.ts
   └── Verifies Supabase connectivity

3. Initialize Redis (if configured)
   └── Required for: RateLimitMiddleware (RedisRateLimitStore)
   └── Optional for single-instance deployments

4. Initialize in-memory stores
   └── OutboxStore, InboxStore, IdempotencyStore, SagaStore, JobStore
   └── Module repositories

5. Initialize ResilientEventBus
   └── Register all event handlers
   └── Connect InboxStore for deduplication

6. Start OutboxProcessor
   └── Begin polling at OUTBOX_POLL_INTERVAL_MS

7. Start SecureJobScheduler
   └── Begin polling for due jobs

8. Start HTTP server
   └── Apply middleware stack
   └── Mount controllers and routes
   └── Bind to port (default: 3000)

9. Health check passes → ready to accept traffic
```

---

## Database Migrations

LavaRapido uses Supabase for persistence. Migrations are managed via the Supabase CLI.

### Apply Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply all pending migrations
supabase db push
```

### Required Tables (Production)

When migrating from in-memory to Supabase-backed stores, create the following tables:

```sql
-- Outbox Messages
CREATE TABLE outbox_messages (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  error TEXT
);
CREATE INDEX idx_outbox_pending ON outbox_messages (status, created_at) WHERE status = 'pending';

-- Inbox Messages (deduplication)
CREATE TABLE inbox_messages (
  event_id TEXT NOT NULL,
  handler_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_id TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, handler_name)
);

-- Idempotency Records
CREATE TABLE idempotency_records (
  key TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_idempotency_expiry ON idempotency_records (expires_at);

-- Saga States
CREATE TABLE saga_states (
  saga_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  completed_steps JSONB NOT NULL DEFAULT '[]',
  failed_step TEXT,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Scheduled Jobs
CREATE TABLE scheduled_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  locked_until TIMESTAMPTZ
);
CREATE INDEX idx_jobs_due ON scheduled_jobs (scheduled_for, status) WHERE status IN ('pending', 'failed');
```

---

## Redis Initialization

Redis is used for rate limiting in production deployments.

### Configuration

Set the `REDIS_URL` environment variable (if using `RedisRateLimitStore`):

```bash
REDIS_URL=redis://localhost:6379
```

### Verification

```bash
redis-cli ping
# Expected: PONG

redis-cli info server | grep redis_version
# Expected: redis_version:<version>
```

### Redis Keys

The rate limiter uses keys in the format `rate:{endpoint}:{ipHash}` with TTL equal to the configured window.

---

## Health Checks

### Liveness Check

```bash
curl -f http://localhost:3000/health
# Expected: {"status":"ok"}
```

### Readiness Check

```bash
curl -f http://localhost:3000/health/ready
# Expected:
# {
#   "status": "healthy",
#   "checks": {
#     "outbox": { "status": "ok", "details": "pending=0, dlq=0" },
#     "scheduler": { "status": "ok", "details": "due_jobs=0" }
#   },
#   "uptime": 42,
#   "timestamp": "2026-03-11T11:42:28.115Z"
# }
```

**Deployment readiness gate:** Do not route traffic until `/health/ready` returns `"status": "healthy"`.

---

## Rolling Deployment

To deploy a new version with zero downtime:

1. **Build and push** the new container image
2. **Deploy the new instance** alongside the current one (do not terminate old instance yet)
3. **Wait for readiness** — new instance must return `"status": "healthy"` from `/health/ready`
4. **Migrate load** — configure load balancer to route new traffic to new instance
5. **Drain old instance** — allow in-flight requests to complete (30-60 second drain)
6. **Terminate old instance**
7. **Verify** — check logs and `/health/ready` on new instance for 5 minutes post-cutover

> ⚠️ **Single-instance limitation:** With in-memory stores, two concurrent instances will have separate state. Outbox and idempotency are not shared. Complete the [State Durability actions from SRE Readiness](./sre-readiness.md#state-durability--partial) before operating multiple instances simultaneously.

---

## Rollback Strategy

If a deployment causes errors:

1. **Identify** — check logs (`correlationId` in error logs) and `/health/ready` status
2. **Decide** — if `status: unhealthy` or error rate increases, initiate rollback
3. **Roll back** — deploy previous known-good container image
4. **Verify** — confirm `/health/ready` returns `healthy` with new (old) instance
5. **Investigate** — review logs for the failed deployment before retrying
6. **Drain DLQ** — if events ended up in dead letter during the failed deployment, use `retryDeadLetter` to replay them after rollback

### Rollback Time Objective

Target rollback completion: < 5 minutes from detection.

### Critical Check After Rollback

```bash
# Check outbox DLQ for messages that may have been stranded
curl http://localhost:3000/health/ready | jq '.checks.outbox'
# If dlq > 0, follow Dead Letter Queue Runbook
```

---

## Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development
npm run dev

# Run tests
npm test

# Start production server
npm start
```

---

## Security Notes

- Never commit `.env` files to version control
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if it is ever exposed
- Use secrets management (AWS Secrets Manager, Supabase Vault, or equivalent) for production deployments
- Ensure all traffic is over HTTPS — TLS termination at the load balancer or hosting platform
