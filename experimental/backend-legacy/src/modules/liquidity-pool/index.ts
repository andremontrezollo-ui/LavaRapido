/**
 * Liquidity Pool Module
 * 
 * Manages pool reserves, obligations, and allocations.
 * 
 * Consumes: DEPOSIT_CONFIRMED (from blockchain-monitor)
 * Emits: LIQUIDITY_ALLOCATED, OBLIGATION_RESERVED, POOL_HEALTH_WARNING, POOL_REBALANCED
 * Consumed by: payment-scheduler (LIQUIDITY_ALLOCATED)
 */

export * from './domain';
export * from './application';
export * from './infra';
