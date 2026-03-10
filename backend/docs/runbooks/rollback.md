# Runbook: Rollback

**System:** LavaRapido Backend  
**Version:** 1.0

---

## When to Roll Back

Roll back immediately if any of the following are true after a deploy:

- `/readiness` returns `status: "unhealthy"` and the cause is not transient
- Error rate increases > 10% compared to pre-deploy baseline
- New critical exceptions appear in logs not present before deploy
- Authentication failures spike > 5x normal rate
- Any migration step failed with a non-recoverable error

---

## Step 1: Stop Traffic to the New Version

```bash
# If using a load balancer, remove the new instance from rotation first.
# For single-instance: stop the new process
docker stop lava-rapido-backend
```

---

## Step 2: Restore the Previous Application Version

```bash
# Identify the previous image tag or git SHA
docker images lava-rapido-backend

# Start the previous image
docker run -d --name lava-rapido-backend \
  --env-file /etc/lava-rapido/.env \
  -p 3000:3000 \
  lava-rapido-backend:<previous-tag>
```

Or, for Node.js direct deploy:
```bash
git stash  # or checkout previous commit
git checkout <previous-sha>
npm ci --prefix backend
npm run build --prefix backend
NODE_ENV=production node backend/dist/server.js &
```

---

## Step 3: Migration Rollback

### Criteria for migration rollback
- Roll back a migration **only** if the new migration breaks the previous application version.
- **Never** roll back a migration if data has already been written using the new schema.

### How to roll back a migration

```bash
# Identify applied migrations
npm run migrate:status --prefix backend

# Roll back the last applied migration
npm run migrate:rollback --prefix backend
```

Each migration must have a corresponding `down` script. Verify this before deploying:
```bash
ls backend/src/infra/database/migrations/
# 001_initial_schema.up.sql
# 001_initial_schema.down.sql
# 002_add_indexes.up.sql
# 002_add_indexes.down.sql
```

### Caveats
- Rolling back a migration that dropped columns is **not recoverable** if data was inserted.
- If a rollback is risky, prefer a **forward fix migration** instead.

---

## Step 4: Verify the Rollback

```bash
curl -sf http://localhost:3000/health | jq .
curl -sf http://localhost:3000/readiness | jq .
```

Both endpoints must be healthy before restoring traffic.

---

## Step 5: Jobs and Sagas in Progress

Before rolling back, check for in-flight work:

```bash
# (Requires admin/service token)
curl -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  http://localhost:3000/api/v1/admin/pool-health | jq .
```

- **Jobs with status `running`:** these will be retried after restart due to lock expiry (TTL: `LOCK_TTL_SECONDS`)
- **Sagas in `started` or `step_completed`:** these will resume on next poll cycle
- **Sagas in `compensating`:** do NOT rollback infrastructure until compensation is complete — see `saga-recovery.md`

---

## Post-Rollback Checklist

- [ ] `/health` returns `200 ok`
- [ ] `/readiness` returns `healthy` or `degraded` with known cause
- [ ] Error rate is back to pre-incident baseline
- [ ] Auth failure rate is normal
- [ ] Outbox DLQ count is not growing
- [ ] All in-flight sagas resumed or completed
