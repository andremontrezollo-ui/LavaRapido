/**
 * Explainable Policy - Can explain its decision
 */

import type { Policy } from './policy';

export interface ExplainablePolicy<TInput, TResult = boolean> extends Policy<TInput, TResult> {
  explain(input: TInput): string;
}
