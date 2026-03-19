/**
 * AddressEventPublisher Port for address-generator
 */

import type { DomainEvent } from '../../../../shared/events/domain-event';

export interface AddressEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
