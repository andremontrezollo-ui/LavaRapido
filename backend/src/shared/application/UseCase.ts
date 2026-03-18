/**
 * UseCase — base contract for all application use cases.
 *
 * Every use case receives a typed input and produces a typed output.
 * Side effects (persistence, events) are performed inside execute().
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
