/**
 * UseCase — base contract for all application use cases.
 *
 * Every use case receives a typed input and returns a typed output.
 * Side-effects (DB, events, external calls) are performed through injected ports.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/**
 * SyncUseCase — variant for use cases without async I/O.
 */
export interface SyncUseCase<TInput, TOutput> {
  execute(input: TInput): TOutput;
}
