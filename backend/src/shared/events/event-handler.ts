/**
 * Typed event handler contract.
 */

import type { DomainEvent } from './domain-event';

export interface EventHandler<E extends DomainEvent = DomainEvent> {
  readonly handlerName: string;
  handle(event: E): Promise<void>;
}
