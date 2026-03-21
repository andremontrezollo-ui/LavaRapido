/**
 * Shared Kernel — exports all shared abstractions.
 */

export * from './events';
export * from './http';
export * from './ports';
export * from './policies';
export * from './config';
export * from './logging';

export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export function success<T>(value: T): Result<T, never> {
  return { success: true, value };
}

export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

export function btcToSat(btc: number): number {
  return Math.round(btc * 100_000_000);
}

export function satToBtc(sat: number): number {
  return sat / 100_000_000;
}
