export interface CreateContactTicketRequest {
  readonly subject: string;
  readonly message: string;
  readonly replyContact?: string;
  readonly ipHash: string;
}
