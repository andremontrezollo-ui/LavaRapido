# Module: log-minimizer

> **Source:** [`backend/src/modules/log-minimizer/`](../../src/modules/log-minimizer/)  
> **Related:** [System Overview](../system-overview.md) · [Architecture](../architecture.md) · [Security Model](../security-model.md)

---

## Purpose

The `log-minimizer` module classifies, redacts, and enforces retention policies on log entries. Its goal is to minimize the attack surface from log data by removing sensitive information (Bitcoin addresses, transaction IDs, credentials, PII) and purging logs that have exceeded their retention window.

---

## Domain Model

### Entities

| Entity | File | Description |
|--------|------|-------------|
| `LogEntry` | [`domain/entities/log-entry.entity.ts`](../../src/modules/log-minimizer/domain/entities/log-entry.entity.ts) | A single log record with content, level, and sensitivity classification |
| `RedactionResult` | [`domain/entities/redaction-result.entity.ts`](../../src/modules/log-minimizer/domain/entities/redaction-result.entity.ts) | The result of applying redaction — redacted content and list of redacted fields |
| `RetentionRule` | [`domain/entities/retention-rule.entity.ts`](../../src/modules/log-minimizer/domain/entities/retention-rule.entity.ts) | A rule specifying retention window for a given sensitivity level |

### Value Objects

| Value Object | File | Description |
|-------------|------|-------------|
| `LogLevel` | [`domain/value-objects/log-level.vo.ts`](../../src/modules/log-minimizer/domain/value-objects/log-level.vo.ts) | Enumerated log level (`debug`, `info`, `warn`, `error`) |
| `RetentionWindow` | [`domain/value-objects/retention-window.vo.ts`](../../src/modules/log-minimizer/domain/value-objects/retention-window.vo.ts) | Duration that log entries must be retained before purge |
| `SensitivityClassification` | [`domain/value-objects/sensitivity-classification.vo.ts`](../../src/modules/log-minimizer/domain/value-objects/sensitivity-classification.vo.ts) | Classification of data sensitivity (`low`, `medium`, `high`, `critical`) |

### Domain Events

| Event | File | Description |
|-------|------|-------------|
| `LOG_REDACTED` | [`domain/events/log-redacted.event.ts`](../../src/modules/log-minimizer/domain/events/log-redacted.event.ts) | A log entry was redacted |
| `LOG_PURGED` | [`domain/events/log-purged.event.ts`](../../src/modules/log-minimizer/domain/events/log-purged.event.ts) | Log entries were purged due to retention policy |

### Domain Errors

| Error | File |
|-------|------|
| `InvalidLogEntryError` | [`domain/errors/invalid-log-entry.error.ts`](../../src/modules/log-minimizer/domain/errors/invalid-log-entry.error.ts) |
| `UnsupportedClassificationError` | [`domain/errors/unsupported-classification.error.ts`](../../src/modules/log-minimizer/domain/errors/unsupported-classification.error.ts) |

### Policies

| Policy | File | Description |
|--------|------|-------------|
| `FieldRedactionPolicy` | [`domain/policies/field-redaction.policy.ts`](../../src/modules/log-minimizer/domain/policies/field-redaction.policy.ts) | Determines which fields in a log entry should be redacted |
| `LogRetentionPolicy` | [`domain/policies/log-retention.policy.ts`](../../src/modules/log-minimizer/domain/policies/log-retention.policy.ts) | Determines retention window based on sensitivity classification |
| `LoggingEligibilityPolicy` | [`domain/policies/logging-eligibility.policy.ts`](../../src/modules/log-minimizer/domain/policies/logging-eligibility.policy.ts) | Determines whether a log entry is eligible to be stored |

---

## Application Layer

### Use Cases

| Use Case | File | Description |
|----------|------|-------------|
| `RedactLogEntryUseCase` | [`application/use-cases/redact-log-entry.usecase.ts`](../../src/modules/log-minimizer/application/use-cases/redact-log-entry.usecase.ts) | Applies field and pattern redaction to a log entry |
| `ClassifyLogDataUseCase` | [`application/use-cases/classify-log-data.usecase.ts`](../../src/modules/log-minimizer/application/use-cases/classify-log-data.usecase.ts) | Assigns sensitivity classification to log data |
| `PurgeExpiredLogsUseCase` | [`application/use-cases/purge-expired-logs.usecase.ts`](../../src/modules/log-minimizer/application/use-cases/purge-expired-logs.usecase.ts) | Removes log entries older than their retention window |
| `EnforceRetentionPolicyUseCase` | [`application/use-cases/enforce-retention-policy.usecase.ts`](../../src/modules/log-minimizer/application/use-cases/enforce-retention-policy.usecase.ts) | Enforces retention rules across stored log entries |

### Ports

| Port | File |
|------|------|
| `LogRepositoryPort` | [`application/ports/log-repository.port.ts`](../../src/modules/log-minimizer/application/ports/log-repository.port.ts) |
| `RedactionEnginePort` | [`application/ports/redaction-engine.port.ts`](../../src/modules/log-minimizer/application/ports/redaction-engine.port.ts) |
| `ClockPort` | [`application/ports/clock.port.ts`](../../src/modules/log-minimizer/application/ports/clock.port.ts) |

### DTOs

| DTO | File |
|-----|------|
| `LogEntryDto` | [`application/dtos/log-entry.dto.ts`](../../src/modules/log-minimizer/application/dtos/log-entry.dto.ts) |
| `RedactedLogEntryDto` | [`application/dtos/redacted-log-entry.dto.ts`](../../src/modules/log-minimizer/application/dtos/redacted-log-entry.dto.ts) |
| `RetentionResultDto` | [`application/dtos/retention-result.dto.ts`](../../src/modules/log-minimizer/application/dtos/retention-result.dto.ts) |

---

## Infrastructure Layer

| Adapter | File | Description |
|---------|------|-------------|
| `RegexRedactionAdapter` | [`infra/adapters/regex-redaction.adapter.ts`](../../src/modules/log-minimizer/infra/adapters/regex-redaction.adapter.ts) | Regex-based pattern redaction engine |
| `StructuredLoggerAdapter` | [`infra/adapters/structured-logger.adapter.ts`](../../src/modules/log-minimizer/infra/adapters/structured-logger.adapter.ts) | Adapter connecting domain logging to `SecureLogger` |
| `LogRepository` | [`infra/repositories/log.repository.ts`](../../src/modules/log-minimizer/infra/repositories/log.repository.ts) | In-memory log entry storage |
| `LogEntryMapper` | [`infra/mappers/log-entry.mapper.ts`](../../src/modules/log-minimizer/infra/mappers/log-entry.mapper.ts) | Domain ↔ persistence mapping |

---

## Events Published

| Event | Trigger | Key Fields |
|-------|---------|-----------|
| `LOG_REDACTED` | `RedactLogEntryUseCase` completes | `entryId`, `fieldsRedacted` |
| `LOG_PURGED` | `PurgeExpiredLogsUseCase` completes | `entriesCount`, `reason` |

---

## Relationship with Shared Logging

The `log-minimizer` module is the **domain-layer** representation of log minimization policy. The **infrastructure-layer** implementation is in `shared/logging/`:

| Concern | Location |
|---------|---------|
| Domain policy (what to redact) | `modules/log-minimizer/domain/policies/` |
| Infrastructure implementation | `shared/logging/redaction-policy.ts` |
| Secure logger | `shared/logging/logger.ts` |

The `SecureLogger` in `shared/logging/` applies `DefaultRedactionPolicy` **on every log call**, independent of this module. The `log-minimizer` module handles higher-level concerns: classifying stored log data and enforcing retention windows.

---

## Tests

| Test File | Description |
|-----------|-------------|
| [`__tests__/field-redaction.policy.test.ts`](../../src/modules/log-minimizer/__tests__/field-redaction.policy.test.ts) | Unit tests for field redaction policy |
| [`__tests__/purge-expired-logs.usecase.test.ts`](../../src/modules/log-minimizer/__tests__/purge-expired-logs.usecase.test.ts) | Unit tests for log purge use case |

---

## Operational Notes

- **Retention purge** should be run periodically (e.g., daily) via `SecureJobScheduler` to remove expired log entries and reduce storage.
- **Sensitivity classification** determines retention windows. Higher sensitivity = shorter retention window.
- **Redaction precedence:** `SecureLogger` (real-time, on every log call) > `log-minimizer` (post-hoc, on stored entries). Both should be in effect.
- In production, the log store should persist to an append-only secure log table in Supabase, with appropriate row-level security (RLS) policies.
