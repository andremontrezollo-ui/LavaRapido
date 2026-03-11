# Runbook: Dead Letter Queue

> **Severity:** SEV-2 (DLQ growing) / SEV-3 (isolated events)  
> **Related:** [Incident Response](./incident-response.md) · [Event Backlog](./event-backlog.md)

---

## Symptoms

- `/health/ready` returns `status: degraded` with `outbox: { status: "degraded", details: "..., dlq=<N>" }`
- Logs showing `Job moved to DLQ`, `Outbox publish failed` after max retries
- Events published but downstream effects not materializing (e.g., payments never scheduled after allocation)
- Specific operations silently failing without user-visible error

---

## Understanding the DLQ

LavaRapido has two DLQ mechanisms:

### 1. EventBus DLQ (`ResilientEventBus`)

Events that fail in all handler attempts (default: 3 retries with exponential backoff) are moved to the in-memory DLQ.

**Source:** [`shared/events/InMemoryEventBus.ts`](../../src/shared/events/InMemoryEventBus.ts)

Each DLQ entry contains:
- `event` — the original `SystemEvent`
- `error` — the error message from the last failure
- `failedAt` — timestamp of the last failure
- `handlerName` — name of the handler that failed
- `retryCount` — number of retries attempted

### 2. Outbox DLQ (`OutboxStore`)

Outbox messages that fail to publish after 5 attempts are moved to `dead_letter` status.

**Source:** [`infra/persistence/outbox.store.ts`](../../src/infra/persistence/outbox.store.ts)

---

## Diagnosis

### Step 1: Quantify DLQ Size

```bash
# Check readiness for outbox DLQ count
curl -s http://localhost:3000/health/ready | jq '.checks.outbox'
# Example: {"status":"degraded","details":"pending=2, dlq=5"}
```

### Step 2: Identify Failed Events

```bash
# Find DLQ-related log entries
docker logs <container_id> 2>&1 | jq 'select(.message | test("DLQ|dead.letter|moved to DLQ"; "i"))'

# Find the event types that ended up in DLQ
docker logs <container_id> 2>&1 | \
  jq 'select(.message | test("DLQ|dead.letter"; "i")) | {eventType: .context.eventType, error: .context.error}'
```

### Step 3: Understand the Error

```bash
# Look at the most recent errors for the failing event type
docker logs <container_id> 2>&1 | \
  jq 'select(.context.eventType == "<EVENT_TYPE>") | select(.level == "error")'
```

### Step 4: Check If Issue Is Resolved

Determine if the underlying error that caused DLQ entries has been fixed:
- Was it a transient error (DB timeout, temporary unavailability)?
- Was it a bug that has since been deployed?
- Is the downstream service now available?

---

## Immediate Mitigation

### Replay Events from EventBus DLQ

The `ResilientEventBus` provides `retryDeadLetter(eventId)` for replaying individual events:

```typescript
// This must be called programmatically (via API endpoint or script)
const success = await eventBus.retryDeadLetter(eventId);
```

If no API endpoint exists for this, consider:
1. Restarting the service (clears in-memory DLQ — events are replayed from Outbox if backed by Supabase)
2. Creating a temporary admin endpoint to trigger replay

### Re-process Outbox Dead Letters

For outbox messages in `dead_letter` status (when using Supabase-backed store):

```sql
-- Reset dead letter messages to pending for reprocessing
UPDATE outbox_messages
SET status = 'pending', retry_count = 0, error = NULL
WHERE status = 'dead_letter'
AND event_type = '<EVENT_TYPE>';
```

> ⚠️ Only reset messages once the root cause is fixed. Resetting without fixing will just re-fail.

### Triage by Event Type

| Event in DLQ | Likely Cause | Check |
|-------------|-------------|-------|
| `DEPOSIT_CONFIRMED` | LiquidityPool handler failing | DB connection; insufficient liquidity |
| `LIQUIDITY_ALLOCATED` | PaymentScheduler handler failing | Payment scheduling error |
| `PAYMENT_EXECUTED` | LogMinimizer handler failing | Log redaction error |
| `SAGA_*` | Saga store persistence failing | SagaStore availability |

---

## Root Cause Analysis

1. **What is the error in the DLQ entry?** → Read the `error` field from DLQ logs
2. **Is the handler throwing a permanent error (bad data) or transient (connectivity)?**
   - Permanent: fix the data or the handler logic
   - Transient: wait for service to recover, then replay
3. **Is the issue systematic (all events of type X fail)?** → Bug in handler or use case
4. **Is it isolated (one event fails)?** → Likely bad data in that specific event

---

## Permanent Fix

| Root Cause | Fix |
|------------|-----|
| Handler throws on certain event shapes | Add input validation; handle edge cases in handler |
| Transient failures with insufficient retries | Increase `MAX_RETRIES` for the specific handler |
| DLQ has no replay API | Implement `POST /api/v1/admin/dlq/retry` endpoint for manual replay |
| EventBus DLQ is in-memory only | Implement persistent DLQ backed by Supabase |
| Root cause was a bug now fixed | Replay all affected DLQ events after deploying the fix |

---

## Post-Recovery Checks

```bash
# 1. Verify DLQ is empty after replay
curl -s http://localhost:3000/health/ready | jq '.checks.outbox.details'
# dlq should be 0

# 2. Verify replayed events produced their downstream effects
# E.g., if DEPOSIT_CONFIRMED was in DLQ, verify LIQUIDITY_ALLOCATED now appears
docker logs --since 10m <container_id> 2>&1 | jq 'select(.context.eventType == "LIQUIDITY_ALLOCATED")'

# 3. Monitor for new DLQ entries
watch -n 30 "curl -s http://localhost:3000/health/ready | jq '.checks.outbox'"
```
