/**
 * Log Retention Policy
 * 
 * Pure business rule: determines data classification, retention, and redaction.
 */

import type { ExplainablePolicy } from '../../../../shared/policies';

export type DataClass = 'public' | 'internal' | 'confidential' | 'restricted';

export interface RetentionInput {
  dataClass: DataClass;
  createdAt: Date;
  currentTime: Date;
}

export interface RetentionResult {
  shouldDelete: boolean;
  shouldArchive: boolean;
  retentionSeconds: number;
  ageSeconds: number;
}

const RETENTION_MAP: Record<DataClass, { retentionSeconds: number; archive: boolean }> = {
  public: { retentionSeconds: 86400 * 365, archive: true },
  internal: { retentionSeconds: 86400 * 30, archive: false },
  confidential: { retentionSeconds: 86400 * 7, archive: false },
  restricted: { retentionSeconds: 0, archive: false },
};

export class LogRetentionPolicy implements ExplainablePolicy<RetentionInput, RetentionResult> {
  evaluate(input: RetentionInput): RetentionResult {
    const config = RETENTION_MAP[input.dataClass];
    const ageSeconds = (input.currentTime.getTime() - input.createdAt.getTime()) / 1000;

    return {
      shouldDelete: ageSeconds >= config.retentionSeconds,
      shouldArchive: config.archive,
      retentionSeconds: config.retentionSeconds,
      ageSeconds: Math.round(ageSeconds),
    };
  }

  explain(input: RetentionInput): string {
    const r = this.evaluate(input);
    if (r.shouldDelete) {
      return `${input.dataClass} data aged ${r.ageSeconds}s exceeds retention of ${r.retentionSeconds}s. ${r.shouldArchive ? 'Archive before delete.' : 'Delete immediately.'}`;
    }
    return `${input.dataClass} data aged ${r.ageSeconds}s within retention of ${r.retentionSeconds}s.`;
  }
}

/** Redaction patterns for sensitive data */
export const REDACTION_PATTERNS: Record<string, RegExp> = {
  bitcoinAddress: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bbc1[a-z0-9]{39,59}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
};

export function redactSensitiveData(text: string): string {
  let result = text;
  for (const pattern of Object.values(REDACTION_PATTERNS)) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
