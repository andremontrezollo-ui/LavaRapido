/**
 * Base Policy Pattern
 */

export interface Policy<TInput, TResult = boolean> {
  evaluate(input: TInput): TResult;
}
