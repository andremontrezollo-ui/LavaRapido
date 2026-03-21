/**
 * Allocation Policy
 */

import type { Policy } from '../../../../shared/policies/Policy';

interface AllocationInput {
  requestedAmount: number;
  availableAmount: number;
  poolStatus: 'healthy' | 'warning' | 'critical';
}

interface AllocationResult {
  allowed: boolean;
  reason?: string;
}

export class AllocationPolicy implements Policy<AllocationInput, AllocationResult> {
  evaluate(input: AllocationInput): AllocationResult {
    if (input.poolStatus === 'critical') {
      return { allowed: false, reason: 'Pool is in critical state' };
    }
    if (input.requestedAmount > input.availableAmount) {
      return { allowed: false, reason: 'Insufficient available liquidity' };
    }
    if (input.requestedAmount <= 0) {
      return { allowed: false, reason: 'Amount must be positive' };
    }
    return { allowed: true };
  }
}
