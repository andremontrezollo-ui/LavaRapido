/**
 * Resilient EventBus contract.
 * Supports publish, subscribe, deduplication via inbox, and DLQ.
 */

import type { DomainEvent, EventType, SystemEvent } from './DomainEvent';
import type { EventHandler } from './event-handler';

export { EventHandler };

export interface EventBusOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  enableDeduplication?: boolean;
}

export interface EventBus {
  publish(event: SystemEvent): Promise<void>;
  publishAll(events: SystemEvent[]): Promise<void>;
  subscribe<T extends EventType>(
    eventType: T,
    handler: EventHandler<Extract<SystemEvent, { type: T }>>,
  ): () => void;
  subscribeAll(handler: EventHandler<SystemEvent>): () => void;
  getDeadLetterQueue(): readonly FailedEvent[];
  retryDeadLetter(eventId: string): Promise<boolean>;
}

export interface FailedEvent {
  readonly event: SystemEvent;
  readonly error: string;
  readonly failedAt: Date;
  readonly handlerName: string;
  readonly retryCount: number;
}
