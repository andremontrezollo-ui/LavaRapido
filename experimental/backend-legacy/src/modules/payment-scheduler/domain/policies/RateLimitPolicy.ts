/**
 * Rate Limit Policy
 * 
 * Pure business rule: evaluates whether a request should be rate-limited.
 */

import type { ExplainablePolicy } from '../../../../shared/policies';

export interface RateLimitInput {
  requestCount: number;
  windowSeconds: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class RateLimitPolicy implements ExplainablePolicy<RateLimitInput, RateLimitResult> {
  evaluate(input: RateLimitInput): RateLimitResult {
    const allowed = input.requestCount < input.maxRequests;
    return {
      allowed,
      remaining: Math.max(0, input.maxRequests - input.requestCount),
      retryAfterSeconds: allowed ? 0 : input.windowSeconds,
    };
  }

  explain(input: RateLimitInput): string {
    const r = this.evaluate(input);
    if (r.allowed) {
      return `Request allowed. ${r.remaining} remaining in window.`;
    }
    return `Rate limited. Retry after ${r.retryAfterSeconds}s.`;
  }
}
