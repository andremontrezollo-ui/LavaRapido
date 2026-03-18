/**
 * contact module — public API.
 */

// Domain
export {
  CONTACT_VALIDATION,
  sanitizeContactInput,
  generateTicketId,
  validateContactPayload,
} from './domain/ContactTicket.ts';
export type { ContactTicket, ContactValidationResult } from './domain/ContactTicket.ts';

// Ports
export type { ContactRepository } from './application/ports/ContactRepository.ts';

// Use cases
export {
  SubmitContactMessageUseCase,
  SubmitContactMessageError,
} from './application/use-cases/SubmitContactMessage.ts';
export type {
  SubmitContactMessageInput,
  SubmitContactMessageOutput,
} from './application/use-cases/SubmitContactMessage.ts';
