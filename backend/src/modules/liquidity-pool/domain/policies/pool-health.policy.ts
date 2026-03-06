/**
 * Pool Health Policy
 */

import type { ExplainablePolicy } from '../../../../shared/policies/ExplainablePolicy';

interface PoolHealthInput {
  utilizationRate: number;
  pendingObligations: number;
}

interface PoolHealthResult {
  status: 'healthy' | 'warning' | 'critical';
  reasons: string[];
}

export class PoolHealthPolicy implements ExplainablePolicy<PoolHealthInput, PoolHealthResult> {
  private readonly warningThreshold = 0.7;
  private readonly criticalThreshold = 0.9;
  private readonly maxPendingObligations = 100;

  evaluate(input: PoolHealthInput): PoolHealthResult {
    const reasons: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (input.utilizationRate >= this.criticalThreshold) {
      status = 'critical';
      reasons.push(`Utilization rate ${(input.utilizationRate * 100).toFixed(1)}% exceeds critical threshold`);
    } else if (input.utilizationRate >= this.warningThreshold) {
      status = 'warning';
      reasons.push(`Utilization rate ${(input.utilizationRate * 100).toFixed(1)}% exceeds warning threshold`);
    }

    if (input.pendingObligations > this.maxPendingObligations) {
      if (status !== 'critical') status = 'warning';
      reasons.push(`${input.pendingObligations} pending obligations exceed limit`);
    }

    return { status, reasons };
  }

  explain(input: PoolHealthInput): string {
    const result = this.evaluate(input);
    return result.reasons.length > 0 ? result.reasons.join('; ') : 'Pool is healthy';
  }
}
