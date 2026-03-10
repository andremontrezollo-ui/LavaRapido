/**
 * Liquidity Pool Module
 * 
 * Manages pool reserves, obligations, and allocations.
 * 
 * Consumes: DEPOSIT_CONFIRMED (from blockchain-monitor)
 * Emits: LIQUIDITY_ALLOCATED, OBLIGATION_RESERVED, POOL_HEALTH_WARNING, POOL_REBALANCED
 * Consumed by: payment-scheduler (LIQUIDITY_ALLOCATED)
 */

// Domain layer — entity-level types and business rules
export * from './domain';
// Application layer — use case types (Reserve, Obligation as plain objects, use cases)
// Named exports to avoid ambiguity with domain Obligation class
export {
  ReserveLiquidityUseCase,
  ConfirmLiquidationUseCase,
  QueryPoolHealthUseCase,
  calculatePoolHealth,
} from './application';
export type {
  PoolLedger,
  IdGenerator as PoolIdGenerator,
  EventPublisher as PoolEventPublisher,
  Reserve,
  PoolHealth,
  PoolEvent,
  LiquidityReservedEvent,
  LiquidityReleasedEvent,
  PoolHealthChangedEvent,
} from './application';
export * from './infra';
