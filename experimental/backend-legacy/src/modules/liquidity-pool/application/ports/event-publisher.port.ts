import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PoolEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
