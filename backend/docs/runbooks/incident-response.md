# Runbook: Incident Response

**System:** LavaRapido Backend  
**Version:** 1.0

---

## Incident Triage Checklist

1. Check `/health` — is the process alive?
2. Check `/readiness` — which checks are failing?
3. Check application logs for recent errors
4. Check external dependency status (PostgreSQL / Redis / Supabase)
5. Check outbox DLQ count
6. Determine if the issue is a deploy regression (compare with last deploy time)

---

## Scenario 1: PostgreSQL / Supabase Failure

**Symptoms:**
- `/readiness` returns `db: { status: "error" }`
- SQL-related errors in logs
- Operations that write data start failing

**Response:**
1. Verify database connectivity from the host:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
2. If the DB is unreachable: check network, firewall, and Supabase dashboard
3. If the DB is up but the app fails: check `SUPABASE_URL` and credentials in `.env`
4. For Supabase outages: check https://status.supabase.com
5. If the outage is prolonged, consider activating read-only mode or a maintenance page
6. Once DB is restored: restart the app if connections were exhausted

**Recovery check:**
```bash
curl http://localhost:3000/readiness | jq '.checks.db'
```

---

## Scenario 2: Redis Failure

**Symptoms:**
- Rate-limit middleware logging errors
- Distributed lock acquisition failures in logs
- `/readiness` shows `lock: { status: "error" }`

**Response:**
1. Verify Redis connectivity:
   ```bash
   redis-cli -h $REDIS_HOST ping
   ```
2. If Redis is unavailable: the app will fall back to in-memory rate-limiting and locking
   - This is safe for single-instance deployments
   - In multi-instance deployments: rate limiting and locking become non-distributed — risk of duplicate processing
3. Restart Redis if it has crashed
4. If Redis data is lost: no permanent data loss (locks and rate limits are ephemeral)
5. Restart the application to re-establish connections

---

## Scenario 3: Outbox DLQ Growth

**Symptoms:**
- `/readiness` shows `outbox: { status: "degraded", details: "dlq=NN" }`
- Events are not being consumed downstream
- Downstream services report missing events

**Response:**
1. Inspect DLQ messages (requires admin API or direct DB query)
2. Identify the failing event type from log entries:
   ```
   grep "Outbox publish failed" logs
   ```
3. Check if downstream event handlers are throwing errors
4. Fix the root cause (handler bug, missing config, dependency down)
5. Replay DLQ messages — see `dlq-replay.md`
6. Monitor DLQ count after replay:
   ```bash
   curl http://localhost:3000/readiness | jq '.checks.outbox'
   ```

---

## Scenario 4: Scheduler Stuck

**Symptoms:**
- `/readiness` shows `scheduler: { status: "degraded", details: "due_jobs=NN" }`
- Scheduled payments or jobs are not executing
- Growing `due_jobs` count

**Response:**
1. Check if the job scheduler loop is running (application must be up)
2. Check for `Job moved to DLQ` log entries — indicates persistent failures
3. Verify that jobs are not stuck in `running` state due to stale locks:
   - Lock TTL is `LOCK_TTL_SECONDS` (default 30s)
   - Stale locks expire automatically after TTL
4. If jobs are in a retry loop: check the error in job `error` field
5. For persistent DLQ jobs: see `dlq-replay.md`

---

## Scenario 5: Readiness Failing Consistently

**Symptoms:**
- `/readiness` returns `status: "unhealthy"`
- One or more checks showing `error`

**Response:**
1. Identify which check is failing from the response body
2. Follow the specific scenario above for that check
3. If the cause is unknown:
   ```bash
   # Enable debug logging temporarily
   LOG_LEVEL=debug node dist/server.js
   ```
4. Do not route traffic to an unhealthy instance
5. If the instance cannot recover, restart it and investigate the cause before re-deploying

---

## Scenario 6: Authentication Failures Spiking

**Symptoms:**
- High rate of 401 responses
- Log entries: `Authentication failed` or `JWT authentication failed`
- Legitimate users being blocked

**Response:**
1. Check if a recent deploy changed auth configuration
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct in the environment
3. Check JWT issuer and audience configuration (`issuers`, `audiences` in JwtVerifier options)
4. Check if the JWT signing key was rotated without updating the key resolver
5. Check clock synchronization — JWT exp validation requires accurate clocks
6. If a key was accidentally revoked: restore it via secrets manager and redeploy
7. If the issue is a compromised key: rotate immediately (see `token-lifecycle.md` — Key Rotation)

---

## Log Analysis Quick Reference

```bash
# All errors in the last 5 minutes
docker logs lava-rapido-backend --since 5m 2>&1 | grep '"level":"error"'

# Auth failures
docker logs lava-rapido-backend 2>&1 | grep 'Authentication failed'

# Outbox failures
docker logs lava-rapido-backend 2>&1 | grep 'Outbox publish failed'

# Job failures
docker logs lava-rapido-backend 2>&1 | grep 'Job moved to DLQ'

# Saga failures
docker logs lava-rapido-backend 2>&1 | grep 'Saga.*failed\|compensat'
```

---

## Escalation

If the incident cannot be resolved within 15 minutes:
1. Activate maintenance mode or remove from load balancer rotation
2. Preserve logs and heap dumps before restarting
3. Escalate to the on-call engineer with: incident timeline, affected endpoints, last deploy SHA
