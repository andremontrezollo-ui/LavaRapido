import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface SessionCreatedEvent extends DomainEvent {
  readonly type: 'SESSION_CREATED';
  readonly sessionId: string;
  readonly expiresAt: Date;
}

export function createSessionCreatedEvent(
  sessionId: string,
  expiresAt: Date,
): SessionCreatedEvent {
  return {
    type: 'SESSION_CREATED',
    sessionId,
    expiresAt,
    timestamp: new Date(),
    aggregateId: sessionId,
  };
}
