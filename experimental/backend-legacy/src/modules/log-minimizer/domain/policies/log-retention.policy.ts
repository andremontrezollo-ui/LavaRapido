/**
 * Log Retention Policy
 */

import type { ExplainablePolicy } from '../../../../shared/policies/ExplainablePolicy';
import type { ClassificationType } from '../value-objects/sensitivity-classification.vo';

interface RetentionInput {
  classification: ClassificationType;
  ageSeconds: number;
}

interface RetentionResult {
  shouldPurge: boolean;
  maxRetentionSeconds: number;
}

export class LogRetentionPolicy implements ExplainablePolicy<RetentionInput, RetentionResult> {
  private readonly limits: Record<ClassificationType, number> = {
    public: 30 * 86400,      // 30 days
    internal: 7 * 86400,     // 7 days
    confidential: 24 * 3600, // 24 hours
    restricted: 1 * 3600,    // 1 hour
  };

  evaluate(input: RetentionInput): RetentionResult {
    const max = this.limits[input.classification];
    return { shouldPurge: input.ageSeconds > max, maxRetentionSeconds: max };
  }

  explain(input: RetentionInput): string {
    const result = this.evaluate(input);
    return result.shouldPurge
      ? `Entry classified as '${input.classification}' has exceeded max retention of ${result.maxRetentionSeconds}s`
      : `Entry is within retention window (${input.ageSeconds}s / ${result.maxRetentionSeconds}s)`;
  }
}
