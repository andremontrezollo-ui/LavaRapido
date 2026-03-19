/**
 * Integration Event factory.
 * Creates events that cross module boundaries with deduplication support.
 */

import type { IntegrationEvent, DomainEvent } from './domain-event';

export function createIntegrationEvent(
  domainEvent: DomainEvent,
  source: string,
  idGenerator: { generate(): string },
): IntegrationEvent {
  return {
    ...domainEvent,
    eventId: idGenerator.generate(),
    source,
  };
}
