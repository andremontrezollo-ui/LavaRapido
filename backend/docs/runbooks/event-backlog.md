# Runbook: Event Backlog

> **Severity:** SEV-2 (growing DLQ) / SEV-3 (processing lag)  
> **Related:** [Incident Response](./incident-response.md) · [Dead Letter Queue](./dead-letter-queue.md)

---

## Symptoms

- `/health/ready` returns `status: degraded` with `outbox: { status: "degraded", details: "pending=<N>, dlq=<N>" }`
- Events not progressing through the system (e.g., confirmed deposits not triggering liquidity allocation)
- `DEPOSIT_CONFIRMED` events published but `LIQUIDITY_ALLOCATED` not appearing
- High count of pending messages in outbox (`pending > 100` for > 5 minutes)
- Logs showing repeated `Outbox publish failed` errors

---

## Diagnosis

### Step 1: Check Current Outbox State

```bash
# Check readiness endpoint
curl -s http://localhost:3000/health/ready | jq '.checks.outbox'
# Example: {"status":"degraded","details":"pending=47, dlq=12"}
```

### Step 2: Check Outbox Processor Logs

```bash
# Look for OutboxProcessor errors
docker logs <container_id> 2>&1 | jq 'select(.message | test("Outbox|outbox"; ""))'

# Look for specific event type failures
docker logs <container_id> 2>&1 | jq 'select(.context.eventType != null)'
```

### Step 3: Check EventBus Handler Errors

```bash
# Look for event handler failures (retry attempts)
docker logs <container_id> 2>&1 | jq 'select(.level == "error") | select(.message | test("handler|Handler"; "i"))'
```

### Step 4: Check Database Connectivity (if using Supabase-backed outbox)

```bash
# If OutboxStore is backed by Supabase, verify DB is accessible
curl -I https://<SUPABASE_URL>/rest/v1/ -H "apikey: <SUPABASE_ANON_KEY>"
```

### Step 5: Identify Blocked Event Type

```bash
# Find which event types are failing
docker logs <container_id> 2>&1 | jq 'select(.context.eventType != null) | .context.eventType' | sort | uniq -c | sort -rn
```

---

## Immediate Mitigation

### If OutboxProcessor Has Stopped

The `OutboxProcessor` runs a background loop. If it stops due to an uncaught error, events will accumulate.

```bash
# Restart the service to restart the OutboxProcessor
docker restart <container_id>

# Verify processing resumes
docker logs -f <container_id> 2>&1 | jq 'select(.message | test("Outbox"; ""))'
```

### If a Specific Event Handler is Failing

If a specific event handler is consistently failing, it will retry up to `MAX_RETRIES` times and then move events to the DLQ.

1. Identify the failing handler from logs
2. If the failure is transient (e.g., downstream service unavailable): wait and monitor
3. If the failure is persistent: investigate the specific handler and associated use case
4. If the backlog is growing dangerously: temporarily increase `OUTBOX_POLL_INTERVAL_MS` to slow processing until the root cause is fixed

### If Processing is Slow But Functional

If events are being processed but slowly:

```bash
# Decrease poll interval (process faster)
OUTBOX_POLL_INTERVAL_MS=500
# Restart with new config
```

---

## Root Cause Analysis

1. **Is the EventBus handler throwing consistently?** → Check handler logs for the specific error
2. **Is the downstream use case failing?** → Check if the use case dependencies are available (DB, etc.)
3. **Is the outbox processor not running?** → Check if the background loop started on startup
4. **Is the poll interval too long?** → Check `OUTBOX_POLL_INTERVAL_MS` value
5. **Is the batch size too small?** → Check `OutboxProcessor` batch size (default: 10)
6. **Is there a dependency cycle causing events to feed back?** → Check event flow diagram

---

## Permanent Fix

| Root Cause | Fix |
|------------|-----|
| Handler throwing uncaught errors | Add error boundaries in handler; fix underlying bug |
| OutboxProcessor crashing | Add process supervision; implement health check for OutboxProcessor |
| DB unavailable causing handler failures | Implement retry with circuit breaker in DB calls |
| Poll interval too long | Tune `OUTBOX_POLL_INTERVAL_MS` for expected throughput |
| Single-threaded bottleneck | Implement concurrent batch processing with per-message locking |

---

## Post-Recovery Checks

```bash
# 1. Verify outbox is being drained
for i in 1 2 3; do
  curl -s http://localhost:3000/health/ready | jq '.checks.outbox.details'
  sleep 30
done
# Pending count should be decreasing

# 2. Check DLQ for any permanently failed events
curl -s http://localhost:3000/health/ready | jq '.checks.outbox'
# dlq count should be 0 (or follow Dead Letter Queue runbook if non-zero)

# 3. Verify end-to-end flow is progressing
# Watch for LIQUIDITY_ALLOCATED and PAYMENT_SCHEDULED events in logs
docker logs -f <container_id> 2>&1 | jq 'select(.context.eventType != null)'
```
