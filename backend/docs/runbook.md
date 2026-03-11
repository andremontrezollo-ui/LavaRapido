# LavaRapido Backend — Operational Runbook

> This is a quick-reference runbook. For detailed incident procedures, see the [runbooks/](./runbooks/) directory.

---

## Quick Reference

| Scenario | Runbook |
|----------|---------|
| Service is down | [Incident Response](./runbooks/incident-response.md) |
| Database connection failure | [Database Failure](./runbooks/database-failure.md) |
| Redis connection failure | [Redis Failure](./runbooks/redis-failure.md) |
| Events piling up unprocessed | [Event Backlog](./runbooks/event-backlog.md) |
| Events stuck in Dead Letter Queue | [Dead Letter Queue](./runbooks/dead-letter-queue.md) |
| Jobs not executing | [Scheduler Failure](./runbooks/scheduler-failure.md) |

---

## Common Diagnostic Commands

### Check Service Health

```bash
# Liveness
curl -s http://localhost:3000/health
# → {"status":"ok"}

# Readiness (with outbox and scheduler checks)
curl -s http://localhost:3000/health/ready | jq .
```

### Check Logs

```bash
# Stream structured logs
docker logs -f <container_id>

# Filter by level
docker logs <container_id> 2>&1 | jq 'select(.level == "error")'

# Filter by correlationId
docker logs <container_id> 2>&1 | jq 'select(.correlationId == "<id>")'
```

### Environment Verification

```bash
# Verify required environment variables are set
printenv SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
```

---

## System Event Flow

```
Deposit detected on blockchain
    → DEPOSIT_DETECTED published
    → DEPOSIT_CONFIRMED published (after N confirmations)
    → Saga: confirm_deposit step
    → Saga: reserve_liquidity step → LIQUIDITY_ALLOCATED
    → Saga: schedule_payments step → PAYMENT_SCHEDULED
    → Scheduler executes due payment → PAYMENT_EXECUTED
```

If the system is healthy, a deposit should progress through all states within:
- Detection: immediate (webhook) or on next poll cycle
- Confirmation: ~60 minutes at 6 blocks (Bitcoin ~10 min/block)
- Liquidity + scheduling: < 1 second after confirmation
- Payment execution: 60–360 seconds after scheduling (jitter delay)

---

## Key Components to Monitor

| Component | Health Indicator | Alert Threshold |
|-----------|-----------------|----------------|
| OutboxProcessor | `outbox.pending` count | > 100 pending for > 5 min |
| OutboxProcessor | `outbox.dlq` count | > 0 |
| SecureJobScheduler | `scheduler.due_jobs` | > 50 due jobs |
| ResilientEventBus | DLQ size | > 0 |
| SagaOrchestrator | Active sagas in `compensating` state | > 0 for > 5 min |

---

## Emergency Procedures

### Restart the Service

```bash
docker restart <container_id>
# Wait for /health/ready to return healthy
```

> ⚠️ Restarting loses all in-memory state. Pending outbox messages, active sagas, and scheduled jobs will be lost until Supabase-backed stores are implemented.

### Drain the Dead Letter Queue

Use `ResilientEventBus.retryDeadLetter(eventId)` to replay individual events from the DLQ. See [Dead Letter Queue Runbook](./runbooks/dead-letter-queue.md).

### Emergency Rate Limit Override

If legitimate traffic is being rate-limited:
1. Increase `RATE_LIMIT_MAX_REQUESTS` and restart
2. Or, temporarily set `RATE_LIMIT_MAX_REQUESTS=1000` as an emergency measure

### Force Configuration Reload

The application validates config at startup only. To reload:
1. Update environment variables in the deployment platform
2. Restart the service
3. Verify `/health/ready` returns `healthy`
