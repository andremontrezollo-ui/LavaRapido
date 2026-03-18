import type { ContactTicket } from '../../domain/entities/contact-ticket.entity.ts';

/**
 * ContactRepository — port for persistence of ContactTicket aggregates.
 */

/** Input type for creating a new ticket (id is caller-generated via ContactTicket.generateTicketId()). */
export interface CreateContactTicketInput {
  ticketId: string;
  subject: string;
  message: string;
  replyContact: string | null;
  ipHash: string;
  createdAt: Date;
}

export interface ContactRepository {
  create(input: CreateContactTicketInput): Promise<ContactTicket>;
}
