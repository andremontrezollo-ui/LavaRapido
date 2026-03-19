import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface SessionEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
