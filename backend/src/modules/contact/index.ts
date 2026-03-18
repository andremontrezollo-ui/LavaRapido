/**
 * contact module public API
 *
 * Import from this index to use the contact module.
 * Do NOT import from internal paths directly.
 */

// Domain
export { ContactTicket } from './domain/entities/contact-ticket.entity';
export type { ContactTicketProps } from './domain/entities/contact-ticket.entity';
export { TicketId } from './domain/value-objects/ticket-id.vo';

// Application — Use Cases
export { SubmitContactMessageUseCase } from './application/use-cases/submit-contact-message.usecase';

// Application — DTOs
export type { SubmitContactRequest, SubmitContactResponse } from './application/dtos/submit-contact.dto';

// Application — Ports
export type { ContactRepository, SaveTicketData, SavedTicket } from './application/ports/contact-repository.port';
