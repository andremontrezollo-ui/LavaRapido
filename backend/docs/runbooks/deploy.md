# Runbook: Deploy

**System:** LavaRapido Backend  
**Version:** 1.0

---

## Prerequisites

- [ ] Docker / Node.js 18+ available on the target host
- [ ] Environment variables configured (see `.env.example`)
- [ ] PostgreSQL reachable (or Supabase project provisioned)
- [ ] Redis reachable (if using distributed lock or rate-limit store)
- [ ] CI pipeline passing on the branch to be deployed
- [ ] Migrations verified locally: `npm run migrate`

---

## Startup Order

1. **Database / Supabase** — must be up and accepting connections before the app starts
2. **Redis** — must be up before app start (used for rate-limiting and distributed locks)
3. **Backend** — starts only after DB and Redis are healthy
4. **Health probe** — wait for `/health` to return `200`
5. **Readiness probe** — wait for `/readiness` to return `{"status":"healthy"}`

---

## Deployment Steps

### 1. Pull and verify the build

```bash
git pull origin main
npm ci --prefix backend
npm run build --prefix backend
```

### 2. Run migrations

```bash
npm run migrate --prefix backend
```

Verify output shows all migrations applied in order:
```
[001_initial_schema] applied
[002_add_indexes] applied
```

### 3. Deploy

```bash
# With Docker
docker build -t lava-rapido-backend:$(git rev-parse --short HEAD) ./backend
docker stop lava-rapido-backend || true
docker run -d --name lava-rapido-backend \
  --env-file /etc/lava-rapido/.env \
  -p 3000:3000 \
  lava-rapido-backend:$(git rev-parse --short HEAD)

# Without Docker (direct Node.js)
NODE_ENV=production node dist/server.js &
```

### 4. Post-deploy checks

```bash
# Liveness
curl -sf http://localhost:3000/health | jq .

# Readiness (all checks must be ok or degraded, never unhealthy)
curl -sf http://localhost:3000/readiness | jq .
```

Expected readiness response:
```json
{
  "isReady": true,
  "checks": {
    "config": { "status": "ok", "details": "env=production" },
    "outbox":  { "status": "ok", "details": "pending=0, dlq=0" },
    "scheduler": { "status": "ok", "details": "due_jobs=0" },
    "lock": { "status": "ok", "details": "probe acquired and released" },
    "sagas": { "status": "ok", "details": "active=0" }
  },
  "timestamp": "2026-03-10T15:00:00.000Z"
}
```

### 5. Validate readiness

- `/readiness` must return `status: "healthy"` or at most `"degraded"` with known causes
- If `"unhealthy"`, **do not route traffic** — rollback immediately (see `rollback.md`)

---

## Environment Variables

| Variable | Required | Description |
|----------|---------|-------------|
| `APP_ENV` | No | `production` / `development` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key (keep secret) |
| `PORT` | No | HTTP port (default: 3000) |
| `HOST` | No | Bind address (default: 0.0.0.0) |
| `LOG_LEVEL` | No | `info` in production |
| `OUTBOX_POLL_INTERVAL_MS` | No | Default: 5000 |
| `LOCK_TTL_SECONDS` | No | Default: 30 |

---

## Smoke Test

After deploy, verify at least one end-to-end flow:

```bash
# Health
curl http://localhost:3000/health

# Readiness  
curl http://localhost:3000/readiness
```
