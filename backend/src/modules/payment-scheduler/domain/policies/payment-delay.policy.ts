import type { ExplainablePolicy } from '../../../../shared/policies/ExplainablePolicy';

interface DelayInput {
  amount: number;
  requestedDelaySeconds: number;
}

interface DelayResult {
  actualDelaySeconds: number;
  jitterSeconds: number;
}

/**
 * JitterProvider abstracts randomness so the policy is deterministically testable.
 * Default implementation uses Math.random(); inject a fixed provider in tests.
 */
export interface JitterProvider {
  nextInt(max: number): number;
}

export const defaultJitterProvider: JitterProvider = {
  nextInt: (max: number) => Math.floor(Math.random() * max),
};

export class PaymentDelayPolicy implements ExplainablePolicy<DelayInput, DelayResult> {
  private readonly minDelay = 300;      // 5 min
  private readonly maxDelay = 86400;    // 24 hours
  private readonly maxJitter = 600;     // 10 min

  constructor(private readonly jitter: JitterProvider = defaultJitterProvider) {}

  evaluate(input: DelayInput): DelayResult {
    const clamped = Math.max(this.minDelay, Math.min(this.maxDelay, input.requestedDelaySeconds));
    const jitterSeconds = this.jitter.nextInt(this.maxJitter);
    return { actualDelaySeconds: clamped + jitterSeconds, jitterSeconds };
  }

  explain(input: DelayInput): string {
    const result = this.evaluate(input);
    return `Delay: ${result.actualDelaySeconds}s (requested: ${input.requestedDelaySeconds}s, jitter: ${result.jitterSeconds}s)`;
  }
}
