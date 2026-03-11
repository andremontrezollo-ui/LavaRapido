# Runbook: Scheduler Failure

> **Severity:** SEV-2 (payments not executing) / SEV-3 (processing lag)  
> **Related:** [Incident Response](./incident-response.md) · [Event Backlog](./event-backlog.md)

---

## Symptoms

- Payments remain in `SCHEDULED` state indefinitely without execution
- `/health/ready` returns `status: degraded` with `scheduler: { status: "degraded", details: "due_jobs=<N>" }`
- No `PAYMENT_EXECUTED` events appearing in logs after expected execution window (60–360 seconds post-scheduling)
- Logs showing `Job locked by another instance` repeatedly for the same job ID
- Jobs stuck in `running` status with `lockedUntil` in the past

---

## Understanding the Scheduler

The `SecureJobScheduler` ([`infra/scheduler/job-scheduler.ts`](../../src/infra/scheduler/job-scheduler.ts)) processes due jobs by:

1. Querying `JobStore` for jobs where `scheduledFor <= now` and `status in ('pending', 'failed')`
2. Acquiring a `DistributedLock` for `job:{jobId}`
3. Calling `JobStore.markRunning(job.id, lockedUntil)`
4. Executing the job via the provided executor function
5. On success: `markCompleted`; on failure: `markFailed` or `markDeadLetter` after `maxAttempts`

**Lock TTL:** Configurable via `LOCK_TTL_SECONDS` (default: 30 seconds)

---

## Diagnosis

### Step 1: Check Scheduler Status

```bash
# Check readiness endpoint for due job count
curl -s http://localhost:3000/health/ready | jq '.checks.scheduler'
# Example: {"status":"degraded","details":"due_jobs=48"}
```

### Step 2: Check Scheduler Logs

```bash
# Look for scheduler activity
docker logs <container_id> 2>&1 | jq 'select(.message | test("Job|job"; ""))'

# Check for lock contention
docker logs <container_id> 2>&1 | jq 'select(.message | test("locked"; "i"))'

# Check for job failures
docker logs <container_id> 2>&1 | jq 'select(.message | test("Job failed|DLQ"; ""))'
```

### Step 3: Identify Stuck Jobs

```bash
# If using Supabase-backed JobStore:
# Query for jobs stuck in 'running' state beyond their lock TTL
# SELECT * FROM scheduled_jobs
# WHERE status = 'running'
# AND locked_until < NOW()
# ORDER BY scheduled_for ASC;
```

### Step 4: Identify Job Type

```bash
# Find the job name/type that is failing
docker logs <container_id> 2>&1 | \
  jq 'select(.context.jobName != null) | {jobName: .context.jobName, error: .context.error}' | \
  sort | uniq -c | sort -rn
```

---

## Immediate Mitigation

### If Scheduler Has Stopped Running

The `SecureJobScheduler` runs a polling loop. If it stops, due jobs will accumulate:

```bash
# Restart the service to restart the scheduler
docker restart <container_id>

# Verify scheduler resumes
docker logs -f <container_id> 2>&1 | jq 'select(.context.jobId != null)'
```

### If Jobs Are Stuck in `running` with Expired Lock

With process-local locks, a job stuck in `running` after a restart means the lock was never released:

```bash
# If using Supabase-backed JobStore, reset stuck running jobs to 'pending':
# UPDATE scheduled_jobs
# SET status = 'pending', locked_until = NULL
# WHERE status = 'running'
# AND locked_until < NOW();
```

With the current in-memory implementation: **restart the service** to clear all locks and reset state.

### If Job Executor is Failing

If the executor function (the business logic called for each job) is consistently failing:

1. Identify the failing job type from logs
2. Check the underlying use case for errors
3. If a dependency (DB, Redis) is unavailable, resolve that first
4. If it's a code bug, deploy a fix before allowing jobs to retry

### If Lock TTL is Too Short

If jobs are taking longer than `LOCK_TTL_SECONDS`, another instance may steal the lock and cause double-execution:

```bash
# Increase lock TTL
LOCK_TTL_SECONDS=60
# Restart with new config
```

---

## Root Cause Analysis

1. **Did the scheduler loop stop?** → Check startup logs; look for unhandled exceptions in the scheduler loop
2. **Are jobs being acquired but not completing?** → Executor function throwing; check job-specific error logs
3. **Are locks not being released?** → Process crash during job execution; lock TTL expiry will resolve this
4. **Is there a dependency unavailable?** → DB, Redis, or downstream service unavailable during job execution
5. **Are jobs being created faster than they're executed?** → Throughput issue; check batch size and poll interval

---

## Permanent Fix

| Root Cause | Fix |
|------------|-----|
| Scheduler loop crashes | Add top-level error handler in scheduler loop; implement health monitoring |
| Executor throwing unhandled errors | Add error handling in executor; test all error paths |
| Stale locks after restart | Implement lock cleanup on startup: reset `running` jobs with expired `lockedUntil` |
| Throughput insufficient | Increase batch size in `processJobs(executor, batchSize)` |
| Jobs accumulating faster than executing | Analyze job creation rate vs execution rate; scale horizontally (after Supabase migration) |
| Idempotency not protecting against double-execution | Verify `IdempotencyGuard` is applied in executor use cases |

---

## Post-Recovery Checks

```bash
# 1. Verify due_jobs count is decreasing
for i in 1 2 3; do
  curl -s http://localhost:3000/health/ready | jq '.checks.scheduler.details'
  sleep 30
done
# due_jobs count should be decreasing

# 2. Verify PAYMENT_EXECUTED events are appearing
docker logs --since 5m <container_id> 2>&1 | jq 'select(.context.eventType == "PAYMENT_EXECUTED")'

# 3. Check for job DLQ entries
docker logs --since 5m <container_id> 2>&1 | jq 'select(.message | test("DLQ"; "i"))'
```
