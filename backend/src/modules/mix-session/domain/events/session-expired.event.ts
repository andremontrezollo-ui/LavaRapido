import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface SessionExpiredEvent extends DomainEvent {
  readonly type: 'SESSION_EXPIRED';
  readonly sessionId: string;
}

export function createSessionExpiredEvent(sessionId: string): SessionExpiredEvent {
  return {
    type: 'SESSION_EXPIRED',
    sessionId,
    timestamp: new Date(),
    aggregateId: sessionId,
  };
}
