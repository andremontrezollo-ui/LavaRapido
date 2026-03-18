/**
 * contact module — public API.
 */

// Domain
export { ContactTicket } from './domain/entities/contact-ticket.entity.ts';

// Application — ports
export type { ContactRepository, CreateContactTicketInput } from './application/ports/contact-repository.port.ts';

// Application — DTOs
export type { SubmitContactRequest, SubmitContactResponse } from './application/dtos/submit-contact.dto.ts';
export { CONTACT_LIMITS } from './application/dtos/submit-contact.dto.ts';

// Application — use cases
export { SubmitContactMessageUseCase, ContactValidationError, RateLimitExceededError } from './application/use-cases/submit-contact-message.usecase.ts';
