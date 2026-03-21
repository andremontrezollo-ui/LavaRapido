/**
 * Log Minimizer - Domain Layer
 * 
 * Data classification and retention policies for privacy-preserving logs.
 */

// Data Classification
export type DataClass = 
  | 'public'           // Can be logged freely
  | 'internal'         // Internal use only, short retention
  | 'confidential'     // Sensitive, minimal retention
  | 'restricted';      // Never log, immediate redaction

export interface DataClassification {
  readonly field: string;
  readonly class: DataClass;
  readonly ttlSeconds?: number;
  readonly redactionPattern?: RegExp;
}

// Retention Policies
export interface RetentionPolicy {
  readonly id: string;
  readonly name: string;
  readonly dataClass: DataClass;
  readonly retentionSeconds: number;
  readonly autoDelete: boolean;
  readonly archiveBeforeDelete: boolean;
}

export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'public',
    name: 'Public Data',
    dataClass: 'public',
    retentionSeconds: 86400 * 365, // 1 year
    autoDelete: true,
    archiveBeforeDelete: true,
  },
  {
    id: 'internal',
    name: 'Internal Data',
    dataClass: 'internal',
    retentionSeconds: 86400 * 30, // 30 days
    autoDelete: true,
    archiveBeforeDelete: false,
  },
  {
    id: 'confidential',
    name: 'Confidential Data',
    dataClass: 'confidential',
    retentionSeconds: 86400 * 7, // 7 days
    autoDelete: true,
    archiveBeforeDelete: false,
  },
  {
    id: 'restricted',
    name: 'Restricted Data',
    dataClass: 'restricted',
    retentionSeconds: 0, // Immediate deletion
    autoDelete: true,
    archiveBeforeDelete: false,
  },
];

// Log Entry
export interface LogEntry {
  readonly id: string;
  readonly timestamp: Date;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly category: 'technical' | 'business' | 'security' | 'audit';
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
  readonly dataClass: DataClass;
  readonly expiresAt: Date;
}

// Domain Events
export interface LogEntryCreatedEvent {
  readonly type: 'LOG_ENTRY_CREATED';
  readonly entryId: string;
  readonly dataClass: DataClass;
  readonly expiresAt: Date;
  readonly timestamp: Date;
}

export interface LogEntryRedactedEvent {
  readonly type: 'LOG_ENTRY_REDACTED';
  readonly entryId: string;
  readonly reason: 'policy' | 'manual' | 'ttl';
  readonly timestamp: Date;
}

export interface ComplianceReportGeneratedEvent {
  readonly type: 'COMPLIANCE_REPORT_GENERATED';
  readonly reportId: string;
  readonly entriesProcessed: number;
  readonly entriesRedacted: number;
  readonly timestamp: Date;
}

export type LogEvent = 
  | LogEntryCreatedEvent 
  | LogEntryRedactedEvent 
  | ComplianceReportGeneratedEvent;

// Redaction Patterns for Sensitive Data
export const REDACTION_PATTERNS: Record<string, RegExp> = {
  bitcoinAddress: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bbc1[a-z0-9]{39,59}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
};
