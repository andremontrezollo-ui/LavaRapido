/**
 * Log Minimizer - Application Layer
 * 
 * Use cases: apply retention policy, generate compliance report.
 */

import type {
  LogEntry,
  RetentionPolicy,
  DataClass,
  LogEvent,
  LogEntryCreatedEvent,
  LogEntryRedactedEvent,
  ComplianceReportGeneratedEvent
} from '../domain';
import { DEFAULT_RETENTION_POLICIES, REDACTION_PATTERNS } from '../domain';

// Compliance Report
export interface ComplianceReport {
  readonly id: string;
  readonly generatedAt: Date;
  readonly period: { start: Date; end: Date };
  readonly summary: {
    totalEntries: number;
    entriesByClass: Record<DataClass, number>;
    entriesRedacted: number;
    entriesArchived: number;
    policiesApplied: string[];
  };
}

// Ports
export interface LogStore {
  save(entry: LogEntry): Promise<void>;
  findExpired(): Promise<LogEntry[]>;
  delete(id: string): Promise<void>;
  findByPeriod(start: Date, end: Date): Promise<LogEntry[]>;
  countByClass(dataClass: DataClass): Promise<number>;
}

export interface ArchiveStore {
  archive(entry: LogEntry): Promise<void>;
}

export interface IdGenerator {
  generate(): string;
}

export interface Clock {
  now(): Date;
}

export interface EventPublisher {
  publish(event: LogEvent): Promise<void>;
}

// Use Cases
export class CreateLogEntryUseCase {
  constructor(
    private readonly store: LogStore,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly publisher: EventPublisher
  ) {}

  async execute(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    dataClass: DataClass,
    metadata?: Record<string, unknown>
  ): Promise<LogEntry> {
    const now = this.clock.now();
    const policy = DEFAULT_RETENTION_POLICIES.find(p => p.dataClass === dataClass);
    const ttl = policy?.retentionSeconds ?? 86400;

    // Redact sensitive data from message
    let sanitizedMessage = message;
    if (dataClass !== 'public') {
      for (const pattern of Object.values(REDACTION_PATTERNS)) {
        sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED]');
      }
    }

    const entry: LogEntry = {
      id: this.idGenerator.generate(),
      timestamp: now,
      level,
      category,
      message: sanitizedMessage,
      metadata: this.sanitizeMetadata(metadata, dataClass),
      dataClass,
      expiresAt: new Date(now.getTime() + ttl * 1000),
    };

    await this.store.save(entry);

    const event: LogEntryCreatedEvent = {
      type: 'LOG_ENTRY_CREATED',
      entryId: entry.id,
      dataClass,
      expiresAt: entry.expiresAt,
      timestamp: now,
    };
    await this.publisher.publish(event);

    return entry;
  }

  private sanitizeMetadata(
    metadata: Record<string, unknown> | undefined,
    dataClass: DataClass
  ): Record<string, unknown> | undefined {
    if (!metadata || dataClass === 'public') return metadata;
    
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        let sanitizedValue = value;
        for (const pattern of Object.values(REDACTION_PATTERNS)) {
          sanitizedValue = sanitizedValue.replace(pattern, '[REDACTED]');
        }
        sanitized[key] = sanitizedValue;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

export class ApplyRetentionPolicyUseCase {
  constructor(
    private readonly store: LogStore,
    private readonly archive: ArchiveStore,
    private readonly publisher: EventPublisher
  ) {}

  async execute(): Promise<number> {
    const expiredEntries = await this.store.findExpired();
    let redactedCount = 0;

    for (const entry of expiredEntries) {
      const policy = DEFAULT_RETENTION_POLICIES.find(
        p => p.dataClass === entry.dataClass
      );

      if (policy?.archiveBeforeDelete) {
        await this.archive.archive(entry);
      }

      await this.store.delete(entry.id);
      redactedCount++;

      const event: LogEntryRedactedEvent = {
        type: 'LOG_ENTRY_REDACTED',
        entryId: entry.id,
        reason: 'ttl',
        timestamp: new Date(),
      };
      await this.publisher.publish(event);
    }

    return redactedCount;
  }
}

export class GenerateComplianceReportUseCase {
  constructor(
    private readonly store: LogStore,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly publisher: EventPublisher
  ) {}

  async execute(periodStart: Date, periodEnd: Date): Promise<ComplianceReport> {
    const entries = await this.store.findByPeriod(periodStart, periodEnd);
    
    const entriesByClass: Record<DataClass, number> = {
      public: 0,
      internal: 0,
      confidential: 0,
      restricted: 0,
    };

    for (const entry of entries) {
      entriesByClass[entry.dataClass]++;
    }

    const now = this.clock.now();
    const report: ComplianceReport = {
      id: this.idGenerator.generate(),
      generatedAt: now,
      period: { start: periodStart, end: periodEnd },
      summary: {
        totalEntries: entries.length,
        entriesByClass,
        entriesRedacted: entriesByClass.restricted + entriesByClass.confidential,
        entriesArchived: entriesByClass.public,
        policiesApplied: DEFAULT_RETENTION_POLICIES.map(p => p.id),
      },
    };

    const event: ComplianceReportGeneratedEvent = {
      type: 'COMPLIANCE_REPORT_GENERATED',
      reportId: report.id,
      entriesProcessed: entries.length,
      entriesRedacted: report.summary.entriesRedacted,
      timestamp: now,
    };
    await this.publisher.publish(event);

    return report;
  }
}
