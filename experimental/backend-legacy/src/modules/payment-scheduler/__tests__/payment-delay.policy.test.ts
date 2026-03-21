import { describe, it, expect } from 'vitest';
import { PaymentDelayPolicy } from '../domain/policies/payment-delay.policy';

describe('PaymentDelayPolicy', () => {
  const policy = new PaymentDelayPolicy();

  it('should clamp delay to minimum', () => {
    const result = policy.evaluate({ amount: 0.1, requestedDelaySeconds: 10 });
    expect(result.actualDelaySeconds).toBeGreaterThanOrEqual(300);
  });

  it('should clamp delay to maximum', () => {
    const result = policy.evaluate({ amount: 0.1, requestedDelaySeconds: 999999 });
    expect(result.actualDelaySeconds).toBeLessThanOrEqual(86400 + 600);
  });

  it('should add jitter', () => {
    const result = policy.evaluate({ amount: 0.1, requestedDelaySeconds: 3600 });
    expect(result.jitterSeconds).toBeGreaterThanOrEqual(0);
    expect(result.jitterSeconds).toBeLessThanOrEqual(600);
  });
});
