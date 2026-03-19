/**
 * Event: ContactTicketCreated
 * Emitted when a new support ticket is successfully created.
 */

export interface ContactTicketCreatedEvent {
  readonly type: 'CONTACT_TICKET_CREATED';
  readonly ticketId: string;
  readonly occurredAt: Date;
}
