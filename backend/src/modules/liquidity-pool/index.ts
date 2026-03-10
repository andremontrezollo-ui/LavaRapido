/**
 * Liquidity Pool Module
 * 
 * Manages pool reserves, obligations, and allocations.
 * 
 * Consumes: DEPOSIT_CONFIRMED (from blockchain-monitor)
 * Emits: LIQUIDITY_ALLOCATED, OBLIGATION_RESERVED, POOL_HEALTH_WARNING, POOL_REBALANCED
 * Consumed by: payment-scheduler (LIQUIDITY_ALLOCATED)
 *
 * NOTE: Application-layer types (Reserve, Obligation) shadow the rich domain types.
 * Use application types for use-case orchestration, domain types for domain logic.
 */

export * from './domain';
export * from './infra';
// Application use-cases (exported explicitly to avoid naming conflicts with domain)
export {
  ReserveLiquidityUseCase,
  ConfirmLiquidationUseCase,
  QueryPoolHealthUseCase,
} from './application';
export type {
  PoolLedger,
  EventPublisher as PoolEventPublisher,
} from './application';
