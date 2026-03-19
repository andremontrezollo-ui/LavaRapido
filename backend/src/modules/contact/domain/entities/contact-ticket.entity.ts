/**
 * ContactTicket Entity
 * Represents a support ticket submitted by a user.
 */

export interface ContactTicketProps {
  ticketId: string;
  subject: string;
  message: string;
  replyContact: string | null;
  ipHash: string;
  createdAt: Date;
}

export class ContactTicket {
  readonly ticketId: string;
  readonly subject: string;
  readonly message: string;
  readonly replyContact: string | null;
  readonly ipHash: string;
  readonly createdAt: Date;

  constructor(props: ContactTicketProps) {
    this.ticketId = props.ticketId;
    this.subject = props.subject;
    this.message = props.message;
    this.replyContact = props.replyContact;
    this.ipHash = props.ipHash;
    this.createdAt = props.createdAt;
  }
}
