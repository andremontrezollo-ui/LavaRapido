/**
 * Deposit Processing Saga
 * Coordinates: blockchain-monitor → liquidity-pool → payment-scheduler
 *
 * Steps:
 * 1. confirm_deposit   — verifies the deposit has sufficient confirmations (blockchain-monitor)
 * 2. reserve_liquidity — reserves funds from the liquidity pool (liquidity-pool)
 * 3. schedule_payments — schedules per-destination payments (payment-scheduler)
 *
 * Compensation order (reverse):
 * - schedule_payments fails  → release_liquidity (undo step 2)
 * - reserve_liquidity fails  → mark_deposit_unprocessed (undo step 1)
 * - confirm_deposit fails    → mark_deposit_unprocessed
 *
 * Known limitation:
 *   The `schedule_payments` compensation is intentionally a no-op because
 *   scheduled payments in 'scheduled' state will be cancelled by the
 *   payment-scheduler via its own expiry/cancellation mechanism.
 *   If immediate cancellation is required, inject a `cancelPayment` dependency.
 */

import type { SagaStep } from '../../infra/saga/saga-orchestrator';
import type { Logger } from '../../shared/logging';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DepositSagaStepName =
  | 'confirm_deposit'
  | 'reserve_liquidity'
  | 'schedule_payments';

export interface DepositSagaContext {
  readonly txId: string;
  readonly amount: number;
  readonly destinations: string[];
  readonly poolId: string;
  readonly correlationId: string;
}

/**
 * JitterProvider abstracts randomness so the saga is deterministically testable.
 * Inject a fixed provider in tests instead of relying on Math.random().
 */
export interface SagaJitterProvider {
  /** Returns a random integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number;
}

export const defaultSagaJitterProvider: SagaJitterProvider = {
  nextInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
};

export interface DepositSagaDependencies {
  confirmDeposit: (txId: string) => Promise<void>;
  reserveLiquidity: (poolId: string, amount: number) => Promise<string>;   // returns allocationId
  schedulePayment: (destination: string, amount: number, delaySeconds: number) => Promise<string>; // returns paymentId
  releaseLiquidity: (poolId: string, allocationId: string) => Promise<void>;
  markDepositUnprocessed: (txId: string) => Promise<void>;
  logger: Logger;
  jitter?: SagaJitterProvider;
}

// ---------------------------------------------------------------------------
// Saga factory
// ---------------------------------------------------------------------------

export function createDepositSagaSteps(
  ctx: DepositSagaContext,
  deps: DepositSagaDependencies,
): SagaStep[] {
  const jitter = deps.jitter ?? defaultSagaJitterProvider;

  let allocationId: string | null = null;
  const paymentIds: string[] = [];
  const perDestinationAmount = ctx.amount / ctx.destinations.length;

  return [
    {
      name: 'confirm_deposit' satisfies DepositSagaStepName,
      async execute() {
        deps.logger.info('Saga: confirming deposit', { step: 'confirm_deposit', correlationId: ctx.correlationId });
        await deps.confirmDeposit(ctx.txId);
      },
      async compensate() {
        deps.logger.warn('Saga: compensating deposit confirmation — marking deposit as unprocessed', { correlationId: ctx.correlationId });
        await deps.markDepositUnprocessed(ctx.txId);
      },
    },
    {
      name: 'reserve_liquidity' satisfies DepositSagaStepName,
      async execute() {
        deps.logger.info('Saga: reserving liquidity', { step: 'reserve_liquidity', correlationId: ctx.correlationId });
        allocationId = await deps.reserveLiquidity(ctx.poolId, ctx.amount);
      },
      async compensate() {
        if (allocationId) {
          deps.logger.warn('Saga: releasing liquidity', { allocationId, correlationId: ctx.correlationId });
          await deps.releaseLiquidity(ctx.poolId, allocationId);
        } else {
          deps.logger.warn('Saga: reserve_liquidity compensation skipped — no allocationId captured', { correlationId: ctx.correlationId });
        }
      },
    },
    {
      name: 'schedule_payments' satisfies DepositSagaStepName,
      async execute() {
        deps.logger.info('Saga: scheduling payments', {
          step: 'schedule_payments',
          count: ctx.destinations.length,
          correlationId: ctx.correlationId,
        });
        for (const dest of ctx.destinations) {
          // Delay is randomised per-destination for privacy; min=60s, max=360s.
          const delaySeconds = jitter.nextInt(60, 360);
          const paymentId = await deps.schedulePayment(dest, perDestinationAmount, delaySeconds);
          paymentIds.push(paymentId);
        }
        deps.logger.info('Saga: payments scheduled', {
          paymentIds,
          correlationId: ctx.correlationId,
        });
      },
      /**
       * Compensation is a no-op by design.
       *
       * Payments in 'scheduled' state carry no funds — they are instructions
       * to the payment-scheduler. If the saga rolls back at this step, the
       * liquidity reservation is released by the previous step's compensation.
       * The orphaned scheduled payments will be cancelled by the
       * payment-scheduler's expiry mechanism.
       *
       * If immediate cancellation is required, inject a `cancelPayment`
       * callback into `DepositSagaDependencies` and call it here.
       */
      async compensate() {
        deps.logger.warn(
          'Saga: schedule_payments compensation is a no-op — orphaned payments will expire via payment-scheduler',
          { paymentIds, correlationId: ctx.correlationId },
        );
      },
    },
  ];
}
