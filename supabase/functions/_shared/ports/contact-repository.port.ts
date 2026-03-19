/**
 * Port: ContactRepository
 * Abstracts all persistence operations for contact tickets.
 */

export interface ContactTicketRecord {
  ticket_id: string;
  created_at: string;
}

export interface CreateContactTicketParams {
  ticketId: string;
  subject: string;
  message: string;
  replyContact: string | null;
  ipHash: string;
}

export interface ContactRepository {
  create(params: CreateContactTicketParams): Promise<ContactTicketRecord>;
}
