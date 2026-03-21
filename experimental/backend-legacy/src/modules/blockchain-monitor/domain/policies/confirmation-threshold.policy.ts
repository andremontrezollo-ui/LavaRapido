/**
 * Confirmation Threshold Policy
 */

import type { Policy } from '../../../../shared/policies/Policy';

interface ConfirmationInput {
  confirmations: number;
  amount: number;
}

interface ConfirmationResult {
  isConfirmed: boolean;
  requiredConfirmations: number;
}

export class ConfirmationThresholdPolicy implements Policy<ConfirmationInput, ConfirmationResult> {
  private readonly thresholds = [
    { maxAmount: 0.01, confirmations: 1 },
    { maxAmount: 0.1, confirmations: 3 },
    { maxAmount: 1.0, confirmations: 6 },
    { maxAmount: Infinity, confirmations: 6 },
  ];

  evaluate(input: ConfirmationInput): ConfirmationResult {
    const threshold = this.thresholds.find(t => input.amount <= t.maxAmount)!;
    return {
      isConfirmed: input.confirmations >= threshold.confirmations,
      requiredConfirmations: threshold.confirmations,
    };
  }
}
