import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface LiquidityAllocatedEvent extends DomainEvent {
  readonly type: 'LIQUIDITY_ALLOCATED';
  readonly allocationId: string;
  readonly amount: number;
  readonly poolId: string;
}

export function createLiquidityAllocatedEvent(allocationId: string, amount: number, poolId: string): LiquidityAllocatedEvent {
  return { type: 'LIQUIDITY_ALLOCATED', allocationId, amount, poolId, timestamp: new Date() };
}
