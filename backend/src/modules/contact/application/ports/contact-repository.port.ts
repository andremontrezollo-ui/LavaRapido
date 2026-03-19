/**
 * Port: ContactRepository
 * Defines the persistence contract for contact tickets.
 * Implemented by infrastructure adapters (e.g. Supabase).
 */

import type { ContactTicket } from '../entities/contact-ticket.entity';

export interface CreateContactTicketParams {
  ticketId: string;
  subject: string;
  message: string;
  replyContact: string | null;
  ipHash: string;
}

export interface ContactRepository {
  create(params: CreateContactTicketParams): Promise<ContactTicket>;
}
