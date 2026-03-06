import type { ExplainablePolicy } from '../../../../shared/policies/ExplainablePolicy';

interface DelayInput {
  amount: number;
  requestedDelaySeconds: number;
}

interface DelayResult {
  actualDelaySeconds: number;
  jitterSeconds: number;
}

export class PaymentDelayPolicy implements ExplainablePolicy<DelayInput, DelayResult> {
  private readonly minDelay = 300;      // 5 min
  private readonly maxDelay = 86400;    // 24 hours
  private readonly maxJitter = 600;     // 10 min

  evaluate(input: DelayInput): DelayResult {
    const clamped = Math.max(this.minDelay, Math.min(this.maxDelay, input.requestedDelaySeconds));
    const jitter = Math.floor(Math.random() * this.maxJitter);
    return { actualDelaySeconds: clamped + jitter, jitterSeconds: jitter };
  }

  explain(input: DelayInput): string {
    const result = this.evaluate(input);
    return `Delay: ${result.actualDelaySeconds}s (requested: ${input.requestedDelaySeconds}s, jitter: ${result.jitterSeconds}s)`;
  }
}
