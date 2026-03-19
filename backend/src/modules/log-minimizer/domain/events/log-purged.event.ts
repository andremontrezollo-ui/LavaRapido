import type { DomainEvent } from '../../../../shared/events/domain-event';

export interface LogPurgedEvent extends DomainEvent {
  readonly type: 'LOG_PURGED';
  readonly entriesCount: number;
  readonly reason: string;
}

export function createLogPurgedEvent(entriesCount: number, reason: string): LogPurgedEvent {
  return { type: 'LOG_PURGED', entriesCount, reason, timestamp: new Date() };
}
