/**
 * Log Minimizer - Application Layer
 *
 * Use cases, DTOs, and ports.
 */

// Use Cases
export { ClassifyLogDataUseCase } from './use-cases/classify-log-data.usecase';
export { EnforceRetentionPolicyUseCase } from './use-cases/enforce-retention-policy.usecase';
export { PurgeExpiredLogsUseCase } from './use-cases/purge-expired-logs.usecase';
export { RedactLogEntryUseCase } from './use-cases/redact-log-entry.usecase';

// DTOs
export type { LogEntryDto } from './dtos/log-entry.dto';
export type { RedactedLogEntryDto } from './dtos/redacted-log-entry.dto';
export type { RetentionResultDto } from './dtos/retention-result.dto';

// Ports
export type { LogRepository } from './ports/log-repository.port';
export type { RedactionEngine } from './ports/redaction-engine.port';
export type { LogClock } from './ports/clock.port';
