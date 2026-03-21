import type { DomainEvent } from '../../../../shared/events/DomainEvent';

export interface LogRedactedEvent extends DomainEvent {
  readonly type: 'LOG_REDACTED';
  readonly entryId: string;
  readonly fieldsRedacted: string[];
}

export function createLogRedactedEvent(entryId: string, fieldsRedacted: string[]): LogRedactedEvent {
  return { type: 'LOG_REDACTED', entryId, fieldsRedacted, timestamp: new Date() };
}
