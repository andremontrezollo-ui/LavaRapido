import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface PaymentEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
