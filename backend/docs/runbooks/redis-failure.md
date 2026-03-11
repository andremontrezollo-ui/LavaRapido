# Runbook: Redis Failure

> **Severity:** SEV-2 (rate limiting unavailable) / SEV-3 (degraded, in-memory fallback)  
> **Related:** [Incident Response](./incident-response.md) · [Architecture](../architecture.md)

---

## Symptoms

- Error logs containing `Redis`, `ECONNREFUSED`, or `redis` keywords
- Rate limiting not functioning (requests not being throttled)
- `/health/ready` returning degraded if Redis is monitored
- `RedisRateLimitStore` operations failing with connection errors
- In development: no visible impact if `InMemoryRateLimitStore` is in use

---

## Diagnosis

### Step 1: Identify Redis Usage

```bash
# Check if Redis is configured
printenv REDIS_URL
# If empty, application is using InMemoryRateLimitStore — Redis failure has no impact
```

### Step 2: Check Error Logs

```bash
# Look for Redis-related errors
docker logs <container_id> 2>&1 | jq 'select(.message | test("redis|ECONN"; "i"))'
```

### Step 3: Test Redis Connectivity

```bash
# Test connection
redis-cli -u $REDIS_URL ping
# Expected: PONG

# Check Redis server info
redis-cli -u $REDIS_URL info server | grep -E "redis_version|uptime_in_seconds|connected_clients"

# Check memory usage
redis-cli -u $REDIS_URL info memory | grep -E "used_memory_human|maxmemory_human"
```

### Step 4: Check Rate Limit Keys

```bash
# List current rate limit keys
redis-cli -u $REDIS_URL keys "rate:*"

# Check a specific key
redis-cli -u $REDIS_URL get "rate:/api/v1/mix-sessions:<ipHash>"
```

---

## Immediate Mitigation

### If Redis is Unreachable

1. **Short-term:** If the application is configured to fall back to `InMemoryRateLimitStore` on Redis failure, rate limiting will continue in degraded mode. Verify this fallback is implemented.
2. **If no fallback:** Rate limiting is disabled. Monitor for abuse while Redis is down.
3. **Do not restart the service** if the issue is Redis-only — the service may be functioning otherwise.

### If Redis is Out of Memory

```bash
# Check memory
redis-cli -u $REDIS_URL info memory | grep used_memory_human

# Remove all rate limit keys (emergency only — this resets all rate limit counters)
redis-cli -u $REDIS_URL eval "return redis.call('del', unpack(redis.call('keys', 'rate:*')))" 0

# Or flush all keys (only if Redis is dedicated to rate limiting)
redis-cli -u $REDIS_URL flushall
```

### If Redis Needs Restart

```bash
# If self-hosted
systemctl restart redis

# If Docker
docker restart <redis_container_id>

# Verify
redis-cli ping
```

---

## Root Cause Analysis

1. **Was Redis restarted?** → Check Redis process logs or cloud provider events
2. **Did Redis run out of memory?** → Check `maxmemory` configuration; review key TTLs
3. **Did the connection string change?** → Check `REDIS_URL` environment variable
4. **Is this a networking issue?** → Check network connectivity between app and Redis
5. **Is Redis being used by another service competing for memory?** → Check connected clients

---

## Permanent Fix

| Root Cause | Fix |
|------------|-----|
| Redis OOM | Configure `maxmemory` and `maxmemory-policy = allkeys-lru` |
| Redis not persistent | Enable Redis persistence (AOF or RDB) for crash recovery |
| No fallback for Redis failure | Implement automatic fallback to `InMemoryRateLimitStore` with logging |
| Wrong connection string | Add connection string validation to startup checks |
| Single point of failure | Use Redis Sentinel or Redis Cluster for high availability |

---

## Post-Recovery Checks

```bash
# 1. Verify Redis is responding
redis-cli -u $REDIS_URL ping

# 2. Check rate limit keys are being created
# Make a test request
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health

# Check if rate limit key was created
redis-cli -u $REDIS_URL keys "rate:*" | head -5

# 3. Verify no Redis errors in logs since recovery
docker logs --since 5m <container_id> 2>&1 | jq 'select(.message | test("redis"; "i"))'
```
