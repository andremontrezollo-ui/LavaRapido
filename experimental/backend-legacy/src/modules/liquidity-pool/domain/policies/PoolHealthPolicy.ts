/**
 * Pool Health Policy
 * 
 * Pure business rule: evaluates pool health based on reserves and thresholds.
 */

import type { ExplainablePolicy } from '../../../../shared/policies';

export interface PoolInput {
  totalAmount: number;
  availableAmount: number;
  reservedAmount: number;
  pendingObligationCount: number;
}

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface PoolHealthResult {
  status: HealthStatus;
  utilizationRate: number;
  availableRate: number;
  actions: ('alert' | 'pause' | 'rebalance')[];
}

export interface HealthThreshold {
  type: 'minimum_available' | 'maximum_utilization' | 'warning_available';
  value: number;
  action: 'alert' | 'pause' | 'rebalance';
}

const DEFAULT_THRESHOLDS: HealthThreshold[] = [
  { type: 'minimum_available', value: 0.1, action: 'pause' },
  { type: 'warning_available', value: 0.2, action: 'alert' },
  { type: 'maximum_utilization', value: 0.9, action: 'rebalance' },
];

export class PoolHealthPolicy implements ExplainablePolicy<PoolInput, PoolHealthResult> {
  constructor(private readonly thresholds: HealthThreshold[] = DEFAULT_THRESHOLDS) {}

  evaluate(input: PoolInput): PoolHealthResult {
    if (input.totalAmount <= 0) {
      return { status: 'critical', utilizationRate: 1, availableRate: 0, actions: ['pause'] };
    }

    const utilizationRate = input.reservedAmount / input.totalAmount;
    const availableRate = input.availableAmount / input.totalAmount;
    const actions: ('alert' | 'pause' | 'rebalance')[] = [];

    for (const threshold of this.thresholds) {
      if (threshold.type === 'minimum_available' && availableRate < threshold.value) {
        actions.push(threshold.action);
      }
      if (threshold.type === 'maximum_utilization' && utilizationRate > threshold.value) {
        actions.push(threshold.action);
      }
      if (threshold.type === 'warning_available' && availableRate < threshold.value) {
        actions.push(threshold.action);
      }
    }

    let status: HealthStatus = 'healthy';
    if (actions.includes('pause')) status = 'critical';
    else if (actions.length > 0) status = 'warning';

    return { status, utilizationRate, availableRate, actions };
  }

  explain(input: PoolInput): string {
    const r = this.evaluate(input);
    return `Pool ${r.status}: ${(r.utilizationRate * 100).toFixed(1)}% utilized, ${(r.availableRate * 100).toFixed(1)}% available. Actions: ${r.actions.join(', ') || 'none'}.`;
  }

  canReserve(input: PoolInput, amount: number): boolean {
    return input.availableAmount >= amount;
  }
}
