# Runbook: Saga Recovery

**System:** LavaRapido Backend — Deposit Processing Saga  
**Version:** 1.0

---

## Overview

The `DepositProcessingSaga` orchestrates the multi-step deposit workflow. Each saga instance has a state that persists across steps. If a step fails, the saga can compensate (undo) completed steps.

**Saga states:**
| State | Meaning |
|-------|---------|
| `started` | Saga created, first step pending |
| `step_completed` | At least one step completed successfully |
| `compensating` | A step failed; compensation is in progress |
| `completed` | All steps finished successfully |
| `failed` | Saga reached terminal failure after compensation |

---

## Identifying Stuck Sagas

### Via readiness endpoint
```bash
curl http://localhost:3000/readiness | jq '.checks.sagas'
# {"status":"ok","details":"active=2"}
```
Active count > 0 is normal. Active count growing unbounded indicates stuck sagas.

### Via application logs
```bash
docker logs lava-rapido-backend 2>&1 | grep 'Saga\|saga' | grep -v 'completed'
```

### Via direct DB query (PostgreSQL)
```sql
-- Find sagas that have been active for more than 30 minutes
SELECT saga_id, status, current_step, completed_steps,
       started_at, updated_at,
       now() - updated_at AS stuck_for
FROM sagas
WHERE status IN ('started', 'step_completed', 'compensating')
  AND updated_at < now() - INTERVAL '30 minutes'
ORDER BY updated_at ASC;
```

---

## Common Stuck Saga Scenarios

### 1. Saga stuck in `step_completed`
**Cause:** A subsequent step never triggered (event not delivered, handler crashed).  
**Action:**
1. Identify which step is next from `current_step` + `completed_steps`
2. Check if the triggering event is in the outbox DLQ
3. If yes: replay the DLQ event (see `dlq-replay.md`)
4. If no: manually trigger the saga to continue (see below)

### 2. Saga stuck in `compensating`
**Cause:** Compensation step is failing (infrastructure issue, idempotency violation).  
**Action:**
1. Do NOT delete or reset the saga — data integrity depends on completing compensation
2. Fix the root cause of the compensation failure
3. The saga orchestrator will automatically retry compensation steps on next poll
4. Monitor until status reaches `failed` or `completed`

### 3. Saga stuck in `started` for extended time
**Cause:** Initial trigger event was not processed.  
**Action:**
1. Check if the blockchain event was ingested
2. Check `IngestBlockchainEventUseCase` in logs
3. Resubmit the triggering event if it was lost

---

## How to Manually Resume a Saga

**Use only when automated retry has failed and root cause is fixed.**

### Option A: Via admin API (when implemented)
```bash
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sagaId": "saga-uuid-here"}' \
  http://localhost:3000/api/v1/admin/sagas/resume
```

### Option B: Via direct state update (emergency)
```sql
-- Before: capture current state for audit
SELECT * FROM sagas WHERE saga_id = '<id>';

-- Reset to allow retry of current step
-- Only do this if the step is safe to retry (idempotent)
UPDATE sagas
SET status = 'step_completed',
    updated_at = now()
WHERE saga_id = '<id>'
  AND status = 'compensating'; -- adjust condition as needed
```

**Caution:** Direct state manipulation can lead to data inconsistency. Document every manual intervention with: saga ID, reason, timestamp, operator.

---

## How to Force-Fail a Saga (Manual Termination)

If a saga cannot be recovered and continuing would cause more harm:

```sql
UPDATE sagas
SET status = 'failed',
    updated_at = now(),
    error = 'Manually terminated: <reason>'
WHERE saga_id = '<id>';
```

After force-failing:
1. Manually reverse any side effects (e.g., credit back a liquidity allocation)
2. File an incident report documenting the lost state
3. Notify affected users if applicable

---

## Inspecting Saga Persisted State

```sql
-- Full state of a specific saga
SELECT
  saga_id,
  status,
  current_step,
  completed_steps,
  payload,
  error,
  started_at,
  updated_at
FROM sagas
WHERE saga_id = '<id>';
```

The `payload` column contains the saga's context (e.g., transaction ID, amounts, addresses). Use it to understand what the saga was doing.

---

## Saga Recovery Checklist

- [ ] Identified all stuck sagas (status `started` or `step_completed` for > 30 min)
- [ ] Root cause identified (DLQ event, infrastructure failure, code bug)
- [ ] Root cause fixed before attempting recovery
- [ ] Recovery action taken (DLQ replay or manual state update)
- [ ] Saga transitions to `completed` or `failed` within expected time
- [ ] No duplicate side effects (re-check idempotency)
- [ ] Incident documented with saga IDs, actions taken, outcomes

---

## Monitoring

After recovery, monitor:

```bash
# Active saga count should trend toward 0 or a stable baseline
watch -n 10 'curl -s http://localhost:3000/readiness | jq ".checks.sagas"'
```

```bash
# No new saga failures
docker logs -f lava-rapido-backend 2>&1 | grep '"level":"error"' | grep -i saga
```
