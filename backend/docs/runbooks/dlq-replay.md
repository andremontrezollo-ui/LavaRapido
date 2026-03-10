# Runbook: DLQ Replay

**System:** LavaRapido Backend — Outbox Dead Letter Queue  
**Version:** 1.0

---

## When to Replay

Replay DLQ messages when:
- Events failed to publish after `maxRetries` attempts
- The root cause of the failure has been fixed
- Downstream handlers are confirmed healthy
- DLQ count is growing and causing `outbox` check to be `degraded`

**Do NOT replay if:**
- The root cause is not yet fixed (will just re-fail and grow the DLQ)
- You cannot identify which event types are in the DLQ
- Replaying would cause duplicate side effects (see Idempotency section below)

---

## Identifying DLQ Messages

### Via readiness endpoint
```bash
curl http://localhost:3000/readiness | jq '.checks.outbox'
# {"status":"degraded","details":"pending=3, failed=1, dlq=15"}
```

### Via application logs
```bash
docker logs lava-rapido-backend 2>&1 | grep '"status":"dead_letter"'
```

### Via direct DB query (PostgreSQL)
```sql
SELECT id, event_type, payload, error, retry_count, last_attempt_at
FROM outbox_messages
WHERE status = 'dead_letter'
ORDER BY last_attempt_at DESC
LIMIT 100;
```

---

## Identifying the Root Cause

1. Look at the `error` field of DLQ messages — it contains the last failure reason
2. Cross-reference with application logs around `last_attempt_at`
3. Common causes:
   - Downstream service unavailable (network, crash)
   - Schema mismatch in event payload
   - Handler threw an unhandled exception
   - Missing configuration (env var not set in new deploy)

**Fix the root cause before replaying.**

---

## How to Replay

### Option A: Via admin API (when implemented)
```bash
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"eventIds": ["id-1", "id-2"]}' \
  http://localhost:3000/api/v1/admin/outbox/replay
```

### Option B: Via direct DB update (current approach)
Reset DLQ messages to `pending` so the outbox processor picks them up:

```sql
-- Preview what will be replayed
SELECT id, event_type, created_at, error
FROM outbox_messages
WHERE status = 'dead_letter';

-- Reset to pending (do this only after fixing root cause)
UPDATE outbox_messages
SET status = 'pending',
    retry_count = 0,
    error = NULL,
    last_attempt_at = NULL
WHERE status = 'dead_letter'
  AND event_type = 'deposit.confirmed'; -- scope to specific type if possible
```

### Option C: Via `ResilientEventBus.retryDeadLetter()`
The in-memory event bus supports per-event retry:
```typescript
const success = await eventBus.retryDeadLetter(eventId);
```
This only works for in-memory DLQ (single-process deployment).

---

## Idempotency and Duplicate Risk

**Every event handler must be idempotent.** DLQ replay may re-deliver an event that was already partially processed.

The system uses an `InboxStore` for deduplication keyed by `(eventId, handlerName)`. If deduplication is enabled:
- Re-delivered events with the same `eventId` will be skipped by already-processed handlers
- New handlers (added after original delivery) will still process the event

**Risk of duplicates exists when:**
- The inbox store was cleared (e.g., app restart with in-memory inbox)
- The `jti`/`eventId` was not set on the original event
- Deduplication was disabled

**Before replaying:**
1. Confirm deduplication is enabled: `enableDeduplication: true` in `ResilientEventBus` options
2. Confirm event payloads contain unique `eventId` or `jti` fields
3. If using in-memory inbox and the app was restarted: **handlers will re-process** — ensure they are idempotent

---

## Observability Before and After Replay

### Before replay
```bash
curl http://localhost:3000/readiness | jq '.checks.outbox'
```
Record: `pending`, `failed`, `dlq` counts.

### After replay (allow 30–60s for the outbox processor to run)
```bash
curl http://localhost:3000/readiness | jq '.checks.outbox'
```
Expect `dlq` to decrease toward 0.

### Monitor logs during replay
```bash
docker logs -f lava-rapido-backend 2>&1 | grep -E 'outbox|dead_letter|published'
```

---

## Post-Replay Checklist

- [ ] DLQ count is 0 (or decreasing)
- [ ] No new DLQ entries being created
- [ ] `/readiness` shows `outbox: { status: "ok" }`
- [ ] Downstream consumers confirmed receiving the events
- [ ] No duplicate side effects observed (payments, notifications, etc.)
