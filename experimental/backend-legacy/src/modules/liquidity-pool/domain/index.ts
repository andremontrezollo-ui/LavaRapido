/**
 * Liquidity Pool - Domain Layer
 */

export { LiquidityPool } from './entities/liquidity-pool.entity';
export type { PoolStatus } from './entities/liquidity-pool.entity';
export { ReserveBalance } from './entities/reserve-balance.entity';
export { Obligation } from './entities/obligation.entity';
export type { ObligationStatus } from './entities/obligation.entity';
export { Allocation } from './entities/allocation.entity';

export { Amount } from './value-objects/amount.vo';
export { ReserveId } from './value-objects/reserve-id.vo';
export { ObligationId } from './value-objects/obligation-id.vo';

export { PoolHealthPolicy } from './policies/pool-health.policy';
export { ReserveThresholdPolicy } from './policies/reserve-threshold.policy';
export { AllocationPolicy } from './policies/allocation-policy';

export type { LiquidityAllocatedEvent } from './events/liquidity-allocated.event';
export { createLiquidityAllocatedEvent } from './events/liquidity-allocated.event';
export type { ObligationReservedEvent } from './events/obligation-reserved.event';
export { createObligationReservedEvent } from './events/obligation-reserved.event';
export type { PoolHealthWarningEvent } from './events/pool-health-warning.event';
export { createPoolHealthWarningEvent } from './events/pool-health-warning.event';
export type { PoolRebalancedEvent } from './events/pool-rebalanced.event';
export { createPoolRebalancedEvent } from './events/pool-rebalanced.event';

export { InsufficientLiquidityError } from './errors/insufficient-liquidity.error';
export { InvalidAllocationError } from './errors/invalid-allocation.error';
export { InconsistentReserveStateError } from './errors/inconsistent-reserve-state.error';
