/**
 * Log Minimizer - Infrastructure Layer
 *
 * Repositories, adapters, and mappers implementing application ports.
 */

// Repositories
export { InMemoryLogRepository } from './repositories/log.repository';

// Adapters
export { RegexRedactionAdapter } from './adapters/regex-redaction.adapter';
export { StructuredLoggerAdapter } from './adapters/structured-logger.adapter';

// Mappers
export { LogEntryMapper } from './mappers/log-entry.mapper';
export type { LogEntryRecord } from './mappers/log-entry.mapper';
