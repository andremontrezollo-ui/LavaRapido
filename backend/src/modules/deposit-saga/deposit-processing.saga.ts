/**
 * Deposit Processing Saga — 4-step saga with real compensation.
 *
 * Steps:
 * 1. reserve_funds         — UPDATE user_wallets reserved_amount
 * 2. create_blockchain_tx  — external blockchain call
 * 3. confirm_transaction   — wait N confirmations (non-reversible)
 * 4. update_ledger         — INSERT ledger_entries
 *
 * Each step has: action, compensate, retry, timeout.
 */

import type { SagaStep } from '../../infra/saga/saga-orchestrator';
import type { Logger } from '../../shared/logging';

export interface DepositSagaContext {
  depositId: string;
  userId: string;
  amount: number;
  walletAddress: string;
  networkId: string;
  correlationId: string;
}

export interface DepositSagaDependencies {
  /** Step 1: reserve funds in user_wallets */
  reserveFunds(userId: string, amount: number): Promise<void>;
  /** Compensation for step 1: revert reserved_amount */
  revertFundsReservation(userId: string, amount: number): Promise<void>;

  /** Step 2: create blockchain transaction */
  createBlockchainTx(walletAddress: string, amount: number, networkId: string): Promise<string>; // returns txHash
  /** Compensation for step 2: cancel pending tx */
  cancelBlockchainTx(txHash: string): Promise<void>;

  /** Step 3: wait for N confirmations */
  confirmTransaction(txHash: string): Promise<void>;
  // No compensation — confirmed tx is irreversible

  /** Step 4: insert ledger entry */
  insertLedgerEntry(userId: string, depositId: string, txHash: string, amount: number): Promise<void>;
  /** Compensation for step 4: mark ledger entry as compensated */
  compensateLedgerEntry(depositId: string): Promise<void>;

  logger: Logger;
}

export function createDepositProcessingSteps(
  ctx: DepositSagaContext,
  deps: DepositSagaDependencies,
): SagaStep[] {
  let blockchainTxHash: string | null = null;

  return [
    {
      name: 'reserve_funds',
      retries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30_000,
      async execute() {
        deps.logger.info('Saga: reserving funds', {
          step: 'reserve_funds',
          userId: ctx.userId,
          amount: ctx.amount,
          correlationId: ctx.correlationId,
        });
        await deps.reserveFunds(ctx.userId, ctx.amount);
      },
      async compensate() {
        deps.logger.warn('Saga: reverting funds reservation', {
          step: 'reserve_funds',
          correlationId: ctx.correlationId,
        });
        await deps.revertFundsReservation(ctx.userId, ctx.amount);
      },
    },

    {
      name: 'create_blockchain_tx',
      retries: 2,
      retryDelayMs: 2000,
      timeoutMs: 120_000,
      async execute() {
        deps.logger.info('Saga: creating blockchain transaction', {
          step: 'create_blockchain_tx',
          walletAddress: ctx.walletAddress,
          networkId: ctx.networkId,
          correlationId: ctx.correlationId,
        });
        blockchainTxHash = await deps.createBlockchainTx(
          ctx.walletAddress,
          ctx.amount,
          ctx.networkId,
        );
        deps.logger.info('Saga: blockchain tx created', {
          txHash: blockchainTxHash,
          correlationId: ctx.correlationId,
        });
      },
      async compensate() {
        if (blockchainTxHash) {
          deps.logger.warn('Saga: cancelling blockchain tx', {
            txHash: blockchainTxHash,
            correlationId: ctx.correlationId,
          });
          await deps.cancelBlockchainTx(blockchainTxHash);
        }
      },
    },

    {
      name: 'confirm_transaction',
      retries: 1,
      retryDelayMs: 5000,
      timeoutMs: 300_000,
      async execute() {
        if (!blockchainTxHash) {
          throw new Error('No blockchain tx hash available for confirmation');
        }
        deps.logger.info('Saga: confirming transaction', {
          step: 'confirm_transaction',
          txHash: blockchainTxHash,
          correlationId: ctx.correlationId,
        });
        await deps.confirmTransaction(blockchainTxHash);
      },
      async compensate() {
        // Confirmed transaction is irreversible — cannot compensate
        deps.logger.error('Saga: confirm_transaction is non-reversible, manual intervention required', {
          correlationId: ctx.correlationId,
          txHash: blockchainTxHash,
        });
        throw new Error('confirm_transaction compensation is not supported — manual intervention required');
      },
    },

    {
      name: 'update_ledger',
      retries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30_000,
      async execute() {
        if (!blockchainTxHash) {
          throw new Error('No blockchain tx hash for ledger entry');
        }
        deps.logger.info('Saga: updating ledger', {
          step: 'update_ledger',
          depositId: ctx.depositId,
          userId: ctx.userId,
          correlationId: ctx.correlationId,
        });
        await deps.insertLedgerEntry(ctx.userId, ctx.depositId, blockchainTxHash, ctx.amount);
      },
      async compensate() {
        deps.logger.warn('Saga: compensating ledger entry', {
          depositId: ctx.depositId,
          correlationId: ctx.correlationId,
        });
        await deps.compensateLedgerEntry(ctx.depositId);
      },
    },
  ];
}

// ---- Legacy adapter (backward compatibility) -----------------------------------

export interface DepositSagaDependenciesLegacy {
  confirmDeposit: (txId: string) => Promise<void>;
  reserveLiquidity: (poolId: string, amount: number) => Promise<string>;
  schedulPayment: (destination: string, amount: number, delaySeconds: number) => Promise<string>;
  releaseLiquidity: (poolId: string, allocationId: string) => Promise<void>;
  markDepositUnprocessed: (txId: string) => Promise<void>;
  logger: Logger;
}

export interface DepositSagaContextLegacy {
  txId: string;
  amount: number;
  destinations: string[];
  poolId: string;
  correlationId: string;
}

export function createDepositSagaSteps(
  ctx: DepositSagaContextLegacy,
  deps: DepositSagaDependenciesLegacy,
): SagaStep[] {
  let allocationId: string | null = null;
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
          await deps.schedulPayment(dest, perDestinationAmount, jitter);
        }
      },
      async compensate() {
        deps.logger.warn('Saga: payment scheduling compensation (payments will expire)', { correlationId: ctx.correlationId });
      },
    },
  ];
}
