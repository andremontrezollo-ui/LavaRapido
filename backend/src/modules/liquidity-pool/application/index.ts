/**
 * Liquidity Pool - Application Layer
 *
 * Use cases: allocate liquidity, reserve/release obligations, register deposit credits,
 * rebalance pool, query pool health.
 */

// Use Cases
export { AllocateLiquidityUseCase } from './use-cases/allocate-liquidity.usecase';
export { GetPoolHealthUseCase } from './use-cases/get-pool-health.usecase';
export { RebalancePoolUseCase } from './use-cases/rebalance-pool.usecase';
export { RegisterDepositCreditUseCase } from './use-cases/register-deposit-credit.usecase';
export { ReleaseObligationUseCase } from './use-cases/release-obligation.usecase';
export { ReserveObligationUseCase } from './use-cases/reserve-obligation.usecase';

// DTOs
export type { LiquidityAllocationDto } from './dtos/liquidity-allocation.dto';
export type { DepositCreditDto } from './dtos/deposit-credit.dto';
export type { ObligationDto } from './dtos/obligation.dto';
export type { PoolHealthDto } from './dtos/pool-health.dto';

// Ports
export type { LiquidityPoolRepository } from './ports/liquidity-pool-repository.port';
export type { ObligationRepository } from './ports/obligation-repository.port';
export type { PoolEventPublisher } from './ports/event-publisher.port';
export type { PoolClock } from './ports/clock.port';
