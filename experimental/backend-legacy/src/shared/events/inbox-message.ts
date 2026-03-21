/**
 * Inbox Message — ensures idempotent processing of incoming events.
 * Before processing, check if event_id + handler_name already exists.
 */

export interface InboxMessage {
  readonly eventId: string;
  readonly eventType: string;
  readonly handlerName: string;
  readonly aggregateId: string;
  readonly processedAt: Date;
  readonly checksum: string;
}

export interface InboxStore {
  exists(eventId: string, handlerName: string): Promise<boolean>;
  save(message: InboxMessage): Promise<void>;
  findByEventId(eventId: string): Promise<InboxMessage[]>;
  countProcessed(since: Date): Promise<number>;
}

export function createInboxMessage(
  eventId: string,
  eventType: string,
  handlerName: string,
  aggregateId: string,
  now: Date,
  checksum: string = '',
): InboxMessage {
  return { eventId, eventType, handlerName, aggregateId, processedAt: now, checksum };
}
