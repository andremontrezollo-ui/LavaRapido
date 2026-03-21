/**
 * AddressGeneratedEvent
 * 
 * Emitted when a new deposit address is successfully generated.
 * Compatible with the shared EventBus (SystemEvent union).
 */

import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface AddressGeneratedEvent extends DomainEvent {
  readonly type: 'ADDRESS_TOKEN_EMITTED';
  readonly tokenId: string;
  readonly namespace: string;
  readonly expiresAt: Date;
}

export function createAddressGeneratedEvent(
  tokenId: string,
  namespace: string,
  expiresAt: Date
): AddressGeneratedEvent {
  return {
    type: 'ADDRESS_TOKEN_EMITTED',
    tokenId,
    namespace,
    expiresAt,
    timestamp: new Date(),
  };
}
