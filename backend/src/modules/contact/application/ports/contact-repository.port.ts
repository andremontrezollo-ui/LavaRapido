/**
 * ContactRepository Port
 */

export interface SaveTicketData {
  ticketId: string;
  subject: string;
  message: string;
  replyContact: string | null;
  ipHash: string;
  createdAt: Date;
}

export interface SavedTicket {
  ticketId: string;
  createdAt: string;
}

export interface ContactRepository {
  save(data: SaveTicketData): Promise<SavedTicket>;
}
