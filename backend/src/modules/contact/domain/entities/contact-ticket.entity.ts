export interface ContactTicket {
  readonly ticketId: string;
  readonly subject: string;
  readonly message: string;
  readonly replyContact: string | null;
  readonly ipHash: string;
  readonly createdAt: Date;
}

export const CONTACT_VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
} as const;
