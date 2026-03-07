/**
 * Deposit Processing Saga
 * Coordinates: blockchain-monitor → liquidity-pool → payment-scheduler
 * 
 * Steps:
 * 1. Confirm deposit (blockchain-monitor)
 * 2. Reserve liquidity (liquidity-pool)
 * 3. Schedule payment (payment-scheduler)
 * 
 * Compensations:
 * - If scheduling fails → release liquidity
 * - If liquidity reservation fails → mark deposit as unprocessed
 */

import type { SagaStep } from '../../infra/saga/saga-orchestrator';
import type { Logger } from '../../shared/logging';

export interface DepositSagaContext {
  txId: string;
  amount: number;
  destinations: string[];
  poolId: string;
  correlationId: string;
}

export interface DepositSagaDependencies {
  confirmDeposit: (txId: string) => Promise<void>;
  reserveLiquidity: (poolId: string, amount: number) => Promise<string>; // returns allocationId
  schedulPayment: (destination: string, amount: number, delaySeconds: number) => Promise<string>; // returns paymentId
  releaseLiquidity: (poolId: string, allocationId: string) => Promise<void>;
  markDepositUnprocessed: (txId: string) => Promise<void>;
  logger: Logger;
}

export function createDepositSagaSteps(
  ctx: DepositSagaContext,
  deps: DepositSagaDependencies,
): SagaStep[] {
  let allocationId: string | null = null;
  const paymentIds: string[] = [];
  const perDestinationAmount = ctx.amount / ctx.destinations.length;

  return [
    {
      name: 'confirm_deposit',
      async execute() {
        deps.logger.info('Saga: confirming deposit', { step: 'confirm_deposit', correlationId: ctx.correlationId });
        await deps.confirmDeposit(ctx.txId);
      },
      async compensate() {
        deps.logger.warn('Saga: compensating deposit confirmation', { correlationId: ctx.correlationId });
        await deps.markDepositUnprocessed(ctx.txId);
      },
    },
    {
      name: 'reserve_liquidity',
      async execute() {
        deps.logger.info('Saga: reserving liquidity', { step: 'reserve_liquidity', correlationId: ctx.correlationId });
        allocationId = await deps.reserveLiquidity(ctx.poolId, ctx.amount);
      },
      async compensate() {
        if (allocationId) {
          deps.logger.warn('Saga: releasing liquidity', { correlationId: ctx.correlationId });
          await deps.releaseLiquidity(ctx.poolId, allocationId);
        }
      },
    },
    {
      name: 'schedule_payments',
      async execute() {
        deps.logger.info('Saga: scheduling payments', { step: 'schedule_payments', count: ctx.destinations.length, correlationId: ctx.correlationId });
        for (const dest of ctx.destinations) {
          const jitter = Math.floor(Math.random() * 300) + 60;
          const paymentId = await deps.schedulPayment(dest, perDestinationAmount, jitter);
          paymentIds.push(paymentId);
        }
      },
      async compensate() {
        deps.logger.warn('Saga: payment scheduling compensation (no-op, payments will expire)', { correlationId: ctx.correlationId });
        // Payments in 'scheduled' state can be cancelled by the scheduler
      },
    },
  ];
}
