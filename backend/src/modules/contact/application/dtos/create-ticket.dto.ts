export interface CreateTicketDto {
  subject: string;
  message: string;
  replyContact?: string;
  ipHash: string;
}

export interface CreateTicketResultDto {
  ticketId: string;
  createdAt: string;
}
