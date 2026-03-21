import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PoolRebalancedEvent extends DomainEvent {
  readonly type: 'POOL_REBALANCED';
  readonly poolId: string;
  readonly previousBalance: number;
  readonly newBalance: number;
}

export function createPoolRebalancedEvent(poolId: string, previousBalance: number, newBalance: number): PoolRebalancedEvent {
  return { type: 'POOL_REBALANCED', poolId, previousBalance, newBalance, timestamp: new Date() };
}
