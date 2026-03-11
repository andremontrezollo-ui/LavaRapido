# ADR-005: Log Minimization and Sensitive Data Redaction

## Status

Accepted

## Context

LavaRapido processes Bitcoin transactions. Logs contain operational data that can inadvertently capture:
- Bitcoin addresses (linking wallet identity to transactions)
- Transaction IDs (64-char hex hashes — directly traceable on-chain)
- IP addresses (linking clients to transactions)
- JWT tokens and API keys (authentication material)
- Any PII in user-provided data

Logging this data creates a secondary data store with potentially lower security controls than the main database. It creates legal risk (GDPR, financial privacy regulations), operational risk (log aggregation services may not be trusted), and privacy risk for system users.

## Decision

We implement **defence-in-depth log minimization** with two layers:

### Layer 1: Real-time Redaction (All Logs)

Every log statement passes through `SecureLogger` ([`shared/logging/logger.ts`](../../src/shared/logging/logger.ts)), which applies `DefaultRedactionPolicy` ([`shared/logging/redaction-policy.ts`](../../src/shared/logging/redaction-policy.ts)) before emission.

The policy:
1. Redacts fields by name (contains: `password`, `secret`, `token`, `key`, `credential`, `mnemonic`, `seed`, etc.)
2. Redacts patterns in string values (Bitcoin addresses, txids, IPs, JWTs)
3. Enforces a whitelist of allowed fields — only whitelisted fields pass through
4. Truncates values at 200 characters

### Layer 2: Post-hoc Retention Enforcement (Stored Logs)

The `log-minimizer` module ([`modules/log-minimizer/`](../../src/modules/log-minimizer/)) handles stored log entries:
1. Classifies log entries by sensitivity level
2. Applies retention windows per sensitivity level
3. Purges expired entries via `PurgeExpiredLogsUseCase`
4. Emits `LOG_REDACTED` and `LOG_PURGED` events for auditing

**Source:** [`shared/logging/redaction-policy.ts`](../../src/shared/logging/redaction-policy.ts) · [`shared/logging/logger.ts`](../../src/shared/logging/logger.ts)

## Consequences

**Benefits:**
- No Bitcoin addresses, transaction IDs, IP addresses, tokens, or credentials appear in log output
- The whitelist approach means unknown fields are redacted by default (secure by default)
- Log aggregation services can be used without risk of sensitive data leakage
- Retention policies limit the window of exposure for stored logs

**Trade-offs:**
- Logs are less useful for debugging — correlating events requires `correlationId` instead of direct data
- A new sensitive field name that doesn't match the blocklist patterns will not be redacted automatically — the blocklist must be maintained
- Pattern redaction (Bitcoin addresses, IPs) uses regex — there may be false positives or edge cases in unusual data formats

## Alternatives Considered

**No redaction, rely on log access controls:** Simpler, but creates a data liability. Any log aggregation service, employee with log access, or security breach exposes the sensitive data.

**Schema-based structured logging:** Emit only pre-defined fields; anything not in the schema is dropped. Provides strong guarantees but is more rigid and harder to add context for debugging.

**Log level filtering (no DEBUG in production):** Reduces log volume but does not address the fundamental problem of sensitive data appearing in `INFO` or `ERROR` level logs.
