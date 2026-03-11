/**
 * Log Minimizer - Domain Layer
 *
 * Entities, value objects, policies, events, and errors.
 */

// Entities
export { LogEntry } from './entities/log-entry.entity';
export { RedactionResult } from './entities/redaction-result.entity';
export { RetentionRule } from './entities/retention-rule.entity';

// Value Objects
export { LogLevel } from './value-objects/log-level.vo';
export type { LogLevelType } from './value-objects/log-level.vo';
export { RetentionWindow } from './value-objects/retention-window.vo';
export { SensitivityClassification } from './value-objects/sensitivity-classification.vo';
export type { ClassificationType } from './value-objects/sensitivity-classification.vo';

// Policies (canonical kebab-case files)
export { FieldRedactionPolicy } from './policies/field-redaction.policy';
export { LogRetentionPolicy } from './policies/log-retention.policy';
export { LoggingEligibilityPolicy } from './policies/logging-eligibility.policy';

// Events
export type { LogPurgedEvent } from './events/log-purged.event';
export { createLogPurgedEvent } from './events/log-purged.event';
export type { LogRedactedEvent } from './events/log-redacted.event';
export { createLogRedactedEvent } from './events/log-redacted.event';

// Errors
export { InvalidLogEntryError } from './errors/invalid-log-entry.error';
export { UnsupportedClassificationError } from './errors/unsupported-classification.error';
