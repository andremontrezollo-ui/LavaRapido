/**
 * SubmitContactMessage Use Case
 *
 * Validates and sanitises the contact payload, creates a ticket entity,
 * persists it, and returns the ticket ID.
 */

import { ContactTicket } from '../../domain/entities/contact-ticket.entity';
import { TicketId } from '../../domain/value-objects/ticket-id.vo';
import type { SubmitContactRequest, SubmitContactResponse } from '../dtos/submit-contact.dto';
import type { ContactRepository } from '../ports/contact-repository.port';

function sanitize(input: string): string {
  return input
    .trim()
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s{3,}/g, '  ');
}

export class SubmitContactMessageUseCase {
  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly getRandomValues: (arr: Uint8Array) => Uint8Array,
  ) {}

  async execute(request: SubmitContactRequest): Promise<SubmitContactResponse> {
    const ticketId = TicketId.generate(this.getRandomValues);

    const ticket = new ContactTicket({
      ticketId,
      subject: sanitize(request.subject),
      message: sanitize(request.message),
      replyContact: request.replyContact ? sanitize(request.replyContact) : null,
      ipHash: request.ipHash,
      createdAt: new Date(),
    });

    const saved = await this.contactRepo.save({
      ticketId: ticket.ticketId.value,
      subject: ticket.subject,
      message: ticket.message,
      replyContact: ticket.replyContact,
      ipHash: ticket.ipHash,
      createdAt: ticket.createdAt,
    });

    return { ticketId: saved.ticketId, createdAt: saved.createdAt };
  }
}
