import { describe, it, expect } from 'vitest';
import { PaymentDelayPolicy } from '../domain/policies/payment-delay.policy';
import type { JitterProvider } from '../domain/policies/payment-delay.policy';

const fixedJitter = (value: number): JitterProvider => ({ nextInt: () => value });

describe('PaymentDelayPolicy', () => {
  it('should clamp delay to minimum', () => {
    const policy = new PaymentDelayPolicy(fixedJitter(0));
    const result = policy.evaluate({ amount: 0.1, requestedDelaySeconds: 10 });
    expect(result.actualDelaySeconds).toBe(300);
    expect(result.jitterSeconds).toBe(0);
  });

  it('should clamp delay to maximum', () => {
    const policy = new PaymentDelayPolicy(fixedJitter(0));
    const result = policy.evaluate({ amount: 0.1, requestedDelaySeconds: 999999 });
    expect(result.actualDelaySeconds).toBe(86400);
  });

  it('should add jitter to the clamped delay', () => {
    const policy = new PaymentDelayPolicy(fixedJitter(300));
    const result = policy.evaluate({ amount: 0.1, requestedDelaySeconds: 3600 });
    expect(result.jitterSeconds).toBe(300);
    expect(result.actualDelaySeconds).toBe(3600 + 300);
  });

  it('default (non-injected) policy adds jitter in [0, 600)', () => {
    const policy = new PaymentDelayPolicy();
    const result = policy.evaluate({ amount: 0.1, requestedDelaySeconds: 3600 });
    expect(result.jitterSeconds).toBeGreaterThanOrEqual(0);
    expect(result.jitterSeconds).toBeLessThan(600);
  });
});
