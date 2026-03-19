import type { DomainEvent } from '../../../../shared/events/domain-event';

export interface PaymentEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
