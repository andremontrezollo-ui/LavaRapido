# Data Retention Policy

> **Context:** This project is a strictly educational simulator / laboratory prototype. It does
> not perform real financial operations. The policy below governs the minimal demo data stored.

## 1. Scope

This policy applies to data stored in the Supabase PostgreSQL database used by the demo
backend (Edge Functions). It covers three tables: `mix_sessions`, `rate_limits`,
and `contact_tickets`.

---

## 2. Data Stored and Retention Periods

### 2.1 `mix_sessions`

| Field | Purpose | Retention |
|---|---|---|
| `id` | Internal UUID — not exposed to users | Deleted after 24 hours |
| `deposit_address` | Mock testnet address — not real mainnet | Deleted after 24 hours |
| `status` | Session lifecycle state | Deleted after 24 hours |
| `expires_at` | Session TTL | Deleted after 24 hours |
| `created_at` | Audit timestamp | Deleted after 24 hours |
| `client_fingerprint_hash` | HMAC-SHA256 of client IP (pseudonymous) | Deleted after 24 hours |
| `public_status_token` | Opaque lookup token (never exposes internal ID) | Deleted after 24 hours |

**Hard retention limit:** 24 hours from `created_at`.  
**Note:** Sessions with `expires_at` in the past are marked `expired` immediately on next
status query and deleted by the cleanup job.

### 2.2 `rate_limits`

| Field | Purpose | Retention |
|---|---|---|
| `ip_hash` | HMAC-SHA256 of client IP (pseudonymous) | Deleted after 1 hour |
| `endpoint` | Function name for rate tracking | Deleted after 1 hour |
| `created_at` | Request timestamp | Deleted after 1 hour |

**Hard retention limit:** 1 hour from `created_at`.

### 2.3 `contact_tickets`

| Field | Purpose | Retention |
|---|---|---|
| `ticket_id` | Opaque public ticket reference | Deleted after 7 days |
| `subject` | Sanitised user-supplied text | Deleted after 7 days |
| `message` | Sanitised user-supplied text | Deleted after 7 days |
| `reply_contact` | Optional, user-supplied (not required) | Deleted after 7 days |
| `ip_hash` | HMAC-SHA256 of client IP (pseudonymous) | Deleted after 7 days |
| `created_at` | Submission timestamp | Deleted after 7 days |

**Hard retention limit:** 7 days from `created_at`.

---

## 3. IP Address Handling

IP addresses are **never stored in plain text**. They are pseudonymised using
**HMAC-SHA256** with the `RATE_LIMIT_HMAC_SECRET` server-side environment variable before
storage. This prevents trivial recovery via dictionary attack and avoids storing a stable
identifier linked to a real user.

If `RATE_LIMIT_HMAC_SECRET` is not configured, the system falls back to plain SHA-256
(less private). **The secret should always be set in production environments.**

---

## 4. Automatic Cleanup

The `cleanup` Edge Function is triggered periodically (via `pg_cron` scheduled job) and:

1. Marks active sessions with `expires_at < now()` as `expired`.
2. **Deletes** `mix_sessions` older than 24 hours.
3. **Deletes** `rate_limits` older than 1 hour.
4. **Deletes** `contact_tickets` older than 7 days.

The cron schedule is configured in `supabase/migrations/20260304130222_f35b96ce-4f3a-461a-abaa-8b8bd234423d.sql`.

---

## 5. Data Not Stored

- **Real Bitcoin addresses from users**: Destination addresses entered in the UI are
  used for UI rendering only. They are **not** persisted to the database in this demo.
- **Transaction data**: No real on-chain data is stored — this is a simulator.
- **User accounts or authentication data**: The simulator requires no registration.
- **Cookies or persistent browser storage**: The Supabase client is configured with
  `persistSession: false` — no auth tokens are stored in `localStorage`.

---

## 6. User Rights (Demo Context)

Since this is a non-production educational simulator:
- No PII (personally identifiable information) is intentionally collected.
- IP hashes are pseudonymous and not reversible.
- All data is deleted automatically within the retention windows above.
- There is no user account system, so data subject requests are not applicable.

---

## 7. Review

This policy should be reviewed whenever the project scope changes or if any new data
collection is introduced.

*Last updated: 2026-03-16*
