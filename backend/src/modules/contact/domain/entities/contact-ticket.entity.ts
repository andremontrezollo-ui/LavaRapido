/**
 * ContactTicket Entity
 *
 * Represents a support ticket submitted via the contact form.
 */

import { TicketId } from '../value-objects/ticket-id.vo';

export interface ContactTicketProps {
  ticketId: TicketId;
  subject: string;
  message: string;
  replyContact: string | null;
  ipHash: string;
  createdAt: Date;
}

const SUBJECT_LIMITS = { min: 3, max: 100 };
const MESSAGE_LIMITS = { min: 10, max: 2000 };
const REPLY_CONTACT_LIMIT = 500;

export class ContactTicket {
  readonly ticketId: TicketId;
  readonly subject: string;
  readonly message: string;
  readonly replyContact: string | null;
  readonly ipHash: string;
  readonly createdAt: Date;

  constructor(props: ContactTicketProps) {
    if (props.subject.length < SUBJECT_LIMITS.min || props.subject.length > SUBJECT_LIMITS.max) {
      throw new Error(`Subject must be ${SUBJECT_LIMITS.min}–${SUBJECT_LIMITS.max} characters`);
    }
    if (props.message.length < MESSAGE_LIMITS.min || props.message.length > MESSAGE_LIMITS.max) {
      throw new Error(`Message must be ${MESSAGE_LIMITS.min}–${MESSAGE_LIMITS.max} characters`);
    }
    if (props.replyContact !== null && props.replyContact.length > REPLY_CONTACT_LIMIT) {
      throw new Error(`Reply contact must be under ${REPLY_CONTACT_LIMIT} characters`);
    }

    this.ticketId = props.ticketId;
    this.subject = props.subject;
    this.message = props.message;
    this.replyContact = props.replyContact;
    this.ipHash = props.ipHash;
    this.createdAt = props.createdAt;
  }
}
