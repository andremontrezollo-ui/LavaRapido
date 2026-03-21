import { describe, it, expect } from 'vitest';
import { PoolHealthPolicy } from '../domain/policies/pool-health.policy';

describe('PoolHealthPolicy', () => {
  const policy = new PoolHealthPolicy();

  it('should return healthy for low utilization', () => {
    const result = policy.evaluate({ utilizationRate: 0.3, pendingObligations: 5 });
    expect(result.status).toBe('healthy');
  });

  it('should return warning for high utilization', () => {
    const result = policy.evaluate({ utilizationRate: 0.75, pendingObligations: 5 });
    expect(result.status).toBe('warning');
  });

  it('should return critical for very high utilization', () => {
    const result = policy.evaluate({ utilizationRate: 0.95, pendingObligations: 5 });
    expect(result.status).toBe('critical');
  });
});
