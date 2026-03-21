/**
 * Blockchain Monitor Module
 * 
 * Responsible for observing blockchain events, tracking deposits,
 * and confirming transactions based on configurable threshold policies.
 * 
 * Emits: DEPOSIT_DETECTED, DEPOSIT_CONFIRMED, TRANSACTION_REORG_DETECTED
 * Consumed by: liquidity-pool (DEPOSIT_CONFIRMED)
 */

export * from './domain';
export * from './application';
export * from './infra';
