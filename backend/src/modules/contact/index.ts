/**
 * contact module index
 */

export { ContactTicket } from './domain/entities/contact-ticket.entity';
export type { ContactTicketProps } from './domain/entities/contact-ticket.entity';
export { InvalidContactPayloadError } from './domain/errors/invalid-contact-payload.error';
export type { ContactTicketCreatedEvent } from './domain/events/contact-ticket-created.event';
export type { ContactRepository, CreateContactTicketParams } from './application/ports/contact-repository.port';
export type { CreateContactTicketRequest } from './application/dtos/create-contact-ticket.request';
export type { ContactTicketResponse } from './application/dtos/contact-ticket.response';
export { CreateContactTicketUseCase } from './application/use-cases/create-contact-ticket.usecase';
