import type { ContactTicket } from '../../domain/entities/contact-ticket.entity.ts';

export interface ContactRepositoryPort {
  create(params: {
    ticketId: string;
    subject: string;
    message: string;
    replyContact: string | null;
    ipHash: string;
  }): Promise<ContactTicket>;
}
