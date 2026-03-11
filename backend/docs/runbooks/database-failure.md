# Runbook: Database Failure

> **Severity:** SEV-1 (total failure) / SEV-2 (partial failure)  
> **Related:** [Incident Response](./incident-response.md) · [SRE Readiness](../sre-readiness.md)

---

## Symptoms

- API requests returning `500 Internal Server Error`
- Error logs containing `ECONNREFUSED`, `connection refused`, `Supabase`, `PostgreSQL`, or `database` keywords
- `/health/ready` returning `status: unhealthy` with `outbox: { status: "error" }`
- Module repositories throwing on read/write operations
- Application fails to start (missing Supabase credentials / URL)

---

## Diagnosis

### Step 1: Confirm Database Connectivity

```bash
# Check recent error logs for database-related errors
docker logs <container_id> 2>&1 | jq 'select(.message | test("database|supabase|ECONN|postgres"; "i"))'

# Test Supabase connectivity directly
curl -I https://<SUPABASE_URL>/rest/v1/ \
  -H "apikey: <SUPABASE_ANON_KEY>"
# Expected: HTTP 200
```

### Step 2: Verify Environment Variables

```bash
# Check that required env vars are set
printenv SUPABASE_URL
printenv SUPABASE_ANON_KEY
printenv SUPABASE_SERVICE_ROLE_KEY
# None should be empty
```

### Step 3: Check Supabase Project Status

```
1. Log in to https://app.supabase.com
2. Select your project
3. Check "Project status" — should be "Active"
4. Check "Logs" for database-level errors
5. Check "Database" → "Health" for connection pool status
```

### Step 4: Check Connection Pool

```bash
# If using Supabase connection pooler (PgBouncer), verify pool capacity
# Supabase dashboard → Database → Connection Pooling
# Check active connections vs pool size
```

---

## Immediate Mitigation

### If Supabase Project is Paused (Free Tier)

Free-tier Supabase projects pause after inactivity:

1. Go to https://app.supabase.com
2. Select your project
3. Click **"Restore project"**
4. Wait 1–2 minutes for project to resume
5. Retry service health check

### If Credentials are Invalid or Missing

1. Retrieve correct keys from Supabase dashboard → Settings → API
2. Update environment variables in deployment platform
3. Restart the service
4. Verify `/health/ready` returns `healthy`

### If Supabase is Having an Outage

1. Check https://status.supabase.com for ongoing incidents
2. **Do not restart the service repeatedly** — this will not help
3. Monitor the Supabase status page for resolution
4. Consider enabling graceful degradation (return 503 for data-dependent endpoints while allowing `/health` to respond)

### If Database Schema is Missing

```bash
# Apply migrations
supabase db push --linked
# Or manually run the migration SQL from deployment.md
```

---

## Root Cause Analysis

After mitigation, investigate the root cause:

1. **Was this a Supabase outage?** → Check Supabase status history
2. **Were credentials rotated?** → Check recent config changes
3. **Was the connection pool exhausted?** → Check connection count vs pool limit in Supabase dashboard
4. **Did a migration fail?** → Check Supabase migration history
5. **Did the free tier pause?** → Check Supabase project last activity

---

## Permanent Fix

| Root Cause | Fix |
|------------|-----|
| Free tier project pausing | Upgrade to paid tier or implement scheduled pings to keep project active |
| Credentials expired/rotated | Automate secret rotation with notifications |
| Connection pool exhausted | Increase pool size in Supabase settings; reduce max concurrent connections in app |
| Schema drift | Enforce migrations in CI/CD pipeline before deployment |
| Network connectivity issue | Add retry logic to database initialization; implement circuit breaker |

---

## Post-Recovery Checks

```bash
# 1. Verify health is fully restored
curl -s http://localhost:3000/health/ready | jq .

# 2. Check if any outbox messages were stranded
# (Currently in-memory, so all pending messages are lost after restart)
# After migrating to Supabase-backed stores:
# SELECT count(*) FROM outbox_messages WHERE status = 'pending';

# 3. Check for dead letter accumulation
# SELECT count(*) FROM outbox_messages WHERE status = 'dead_letter';

# 4. Review error rate in logs since recovery
docker logs --since 10m <container_id> 2>&1 | jq 'select(.level == "error")' | wc -l
```
