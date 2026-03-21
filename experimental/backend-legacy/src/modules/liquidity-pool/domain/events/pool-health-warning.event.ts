import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PoolHealthWarningEvent extends DomainEvent {
  readonly type: 'POOL_HEALTH_WARNING';
  readonly poolId: string;
  readonly status: string;
  readonly utilizationRate: number;
}

export function createPoolHealthWarningEvent(poolId: string, status: string, utilizationRate: number): PoolHealthWarningEvent {
  return { type: 'POOL_HEALTH_WARNING', poolId, status, utilizationRate, timestamp: new Date() };
}
