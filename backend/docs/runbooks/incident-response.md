# Runbook: Incident Response

> **Related:** [SRE Readiness](../sre-readiness.md) · [Observability](../observability.md)

---

## Severity Levels

| Level | Criteria | Response Time | Example |
|-------|----------|---------------|---------|
| **SEV-1** | Service is completely unavailable; no deposits or payments processing | Immediate (< 15 min) | `/health` returns non-200; process crashed |
| **SEV-2** | Critical function degraded; DLQ growing; saga compensations firing | < 1 hour | `dlq > 0`; active sagas stuck in `compensating` |
| **SEV-3** | Non-critical degradation; elevated retry rate; single component failing | < 4 hours | Outbox lag > 5 min; rate limit spike |
| **SEV-4** | No user impact; informational; potential future risk | Next business day | Log anomalies; approaching thresholds |

---

## On-Call Responsibilities

| Role | Responsibility |
|------|---------------|
| **Incident Commander** | Declare severity; coordinate response; own communication |
| **Primary Responder** | Diagnose and implement mitigation; run runbooks |
| **Secondary Responder** | Support diagnosis; escalation backup |
| **Communication Lead** | Draft and send status updates to stakeholders |

---

## Escalation Flow

```
Alert fires
    │
    ▼
Primary Responder notified
    │
    ├─ Can diagnose within 15 min?
    │       YES → Proceed with runbook
    │       NO  → Escalate to Secondary Responder
    │
    ├─ Is this SEV-1 or SEV-2?
    │       YES → Notify Incident Commander; open incident channel
    │       NO  → Primary Responder continues
    │
    └─ Not resolved within SLA?
            → Escalate to engineering lead → CTO (SEV-1 only)
```

---

## Incident Response Procedure

### 1. Acknowledge and Classify

```bash
# 1. Check liveness
curl -s http://localhost:3000/health

# 2. Check readiness
curl -s http://localhost:3000/health/ready | jq .

# 3. Check recent error logs
docker logs <container_id> 2>&1 | tail -100 | jq 'select(.level == "error")'
```

Classify as SEV-1 through SEV-4 based on the criteria above.

### 2. Notify

- Open an incident channel: `#incident-<date>-<brief-description>`
- Post initial assessment:
  ```
  🚨 Incident opened: <title>
  Severity: SEV-<N>
  Time detected: <time>
  Symptoms: <description>
  Impact: <what is affected>
  Investigating: <who>
  ```

### 3. Diagnose

Follow the appropriate runbook:

| Symptom | Runbook |
|---------|---------|
| DB errors in logs | [Database Failure](./database-failure.md) |
| Redis errors in logs | [Redis Failure](./redis-failure.md) |
| `outbox.pending` growing | [Event Backlog](./event-backlog.md) |
| `outbox.dlq > 0` | [Dead Letter Queue](./dead-letter-queue.md) |
| `scheduler.due_jobs` growing | [Scheduler Failure](./scheduler-failure.md) |

### 4. Mitigate

Execute the immediate mitigation steps in the appropriate runbook.

Post mitigation status:
```
✅ Mitigation applied: <description>
Status: stabilized / still degraded
Next step: <action>
```

### 5. Verify Recovery

```bash
# Confirm health returns healthy
curl -s http://localhost:3000/health/ready | jq '.status'

# Check logs for continued errors
docker logs --since 5m <container_id> 2>&1 | jq 'select(.level == "error")' | wc -l
```

### 6. Close Incident

Post resolution:
```
✅ Incident resolved
Duration: <time from detection to resolution>
Root cause: <brief description>
Fix applied: <description>
Follow-up: <postmortem date if needed>
```

---

## Communication Templates

### Internal (Slack/Teams) — Incident Opened

```
🚨 INCIDENT - SEV-<N>
Service: LavaRapido Backend
Time: <ISO timestamp>
Impact: <what users/processes are affected>
Status: Investigating
IC: @<name>
Responder: @<name>
```

### Internal — Mitigation Applied

```
🔧 MITIGATION APPLIED - SEV-<N> still open
Action taken: <description>
Current status: <degraded/stabilizing>
ETA to resolution: <estimate>
```

### Internal — Resolved

```
✅ RESOLVED - SEV-<N>
Duration: <duration>
Root cause: <brief>
Postmortem: <required Y/N>
```

### External (Status Page / Email) — SEV-1/SEV-2

```
Service Notification — <date>

We are currently investigating an issue affecting [Bitcoin deposit processing / payment scheduling].
Our team is actively working on a resolution.

Time of first impact: <time>
Current status: Investigating

We will provide updates every 30 minutes until resolved.
```

---

## Postmortem Process

Required for: all SEV-1 incidents and SEV-2 incidents with user impact.

### Postmortem Template

```markdown
# Postmortem: <Incident Title>
**Date:** <incident date>
**Duration:** <duration>
**Severity:** SEV-<N>
**Authors:** <names>

## Summary
<2-3 sentence description of what happened and its impact>

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert fired / first detection |
| HH:MM | Responder engaged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Incident resolved |

## Root Cause
<Detailed technical explanation>

## 5-Whys Analysis
1. Why did <symptom> occur? → <answer>
2. Why did <answer> occur? → <answer>
3. Why did <answer> occur? → <answer>
4. Why did <answer> occur? → <answer>
5. Why did <answer> occur? → <root cause>

## Impact
- Users affected: <count or N/A>
- Operations impacted: <deposits/payments/both>
- Data loss: <yes/no — describe if yes>

## What Went Well
- <observation>

## What Went Poorly
- <observation>

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| <specific action> | @<name> | <date> |
```

### Blameless Culture

Postmortems focus on **system failures**, not individual mistakes. The goal is to improve reliability, not assign blame. All participants are expected to share observations honestly.
