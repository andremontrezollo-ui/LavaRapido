/**
 * TokenIssuedEvent
 * 
 * Emitted when a token is issued for a generated address.
 * Compatible with the shared EventBus (SystemEvent union).
 */

import type { DomainEvent } from '../../../../shared/events/domain-event';

export interface TokenIssuedEvent extends DomainEvent {
  readonly type: 'ADDRESS_TOKEN_RESOLVED';
  readonly tokenId: string;
}

export function createTokenIssuedEvent(tokenId: string): TokenIssuedEvent {
  return {
    type: 'ADDRESS_TOKEN_RESOLVED',
    tokenId,
    timestamp: new Date(),
  };
}
