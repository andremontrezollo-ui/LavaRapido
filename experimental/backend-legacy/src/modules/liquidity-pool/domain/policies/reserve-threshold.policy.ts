/**
 * Reserve Threshold Policy
 */

import type { Policy } from '../../../../shared/policies/Policy';

interface ThresholdInput {
  availableRate: number;
}

interface ThresholdResult {
  action: 'none' | 'alert' | 'pause' | 'rebalance';
}

export class ReserveThresholdPolicy implements Policy<ThresholdInput, ThresholdResult> {
  evaluate(input: ThresholdInput): ThresholdResult {
    if (input.availableRate < 0.1) return { action: 'pause' };
    if (input.availableRate < 0.2) return { action: 'alert' };
    if (input.availableRate > 0.9) return { action: 'rebalance' };
    return { action: 'none' };
  }
}
