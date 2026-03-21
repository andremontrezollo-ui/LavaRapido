/**
 * Logging Eligibility Policy
 */

import type { Policy } from '../../../../shared/policies/Policy';
import type { LogLevelType } from '../value-objects/log-level.vo';

interface EligibilityInput {
  level: LogLevelType;
  minimumLevel: LogLevelType;
}

export class LoggingEligibilityPolicy implements Policy<EligibilityInput, boolean> {
  private readonly order: Record<LogLevelType, number> = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };

  evaluate(input: EligibilityInput): boolean {
    return this.order[input.level] >= this.order[input.minimumLevel];
  }
}
