/**
 * Use Case: CreateContactTicket
 *
 * Validates, sanitizes, and persists a contact support ticket.
 * Ticket ID generation is domain logic, not infrastructure concern.
 */

import type { Result } from '../../../shared';
import { success, failure } from '../../../shared';
import { InvalidContactPayloadError } from '../domain/errors/invalid-contact-payload.error';
import type { ContactRepository } from '../ports/contact-repository.port';
import type { CreateContactTicketRequest } from '../dtos/create-contact-ticket.request';
import type { ContactTicketResponse } from '../dtos/contact-ticket.response';

const VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
} as const;

const TICKET_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTicketId(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return 'TKT-' + Array.from(array, (b) => TICKET_CHARS[b % TICKET_CHARS.length]).join('');
}

function sanitize(input: string): string {
  return input
    .trim()
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s{3,}/g, '  ');
}

export class CreateContactTicketUseCase {
  constructor(private readonly contactRepo: ContactRepository) {}

  async execute(request: CreateContactTicketRequest): Promise<Result<ContactTicketResponse>> {
    const { subject, message, replyContact } = request;

    if (
      typeof subject !== 'string' ||
      subject.trim().length < VALIDATION.subject.min ||
      subject.trim().length > VALIDATION.subject.max
    ) {
      return failure(
        new InvalidContactPayloadError(
          `Subject must be ${VALIDATION.subject.min}-${VALIDATION.subject.max} characters`,
          'subject',
        ),
      );
    }

    if (
      typeof message !== 'string' ||
      message.trim().length < VALIDATION.message.min ||
      message.trim().length > VALIDATION.message.max
    ) {
      return failure(
        new InvalidContactPayloadError(
          `Message must be ${VALIDATION.message.min}-${VALIDATION.message.max} characters`,
          'message',
        ),
      );
    }

    if (
      replyContact !== undefined &&
      replyContact !== '' &&
      replyContact.length > VALIDATION.replyContact.max
    ) {
      return failure(
        new InvalidContactPayloadError(
          `Reply contact must be under ${VALIDATION.replyContact.max} characters`,
          'replyContact',
        ),
      );
    }

    try {
      const ticket = await this.contactRepo.create({
        ticketId: generateTicketId(),
        subject: sanitize(subject),
        message: sanitize(message),
        replyContact: replyContact ? sanitize(replyContact) : null,
        ipHash: request.ipHash,
      });

      return success({
        ticketId: ticket.ticketId,
        createdAt: ticket.createdAt.toISOString(),
      });
    } catch (err) {
      return failure(err instanceof Error ? err : new Error('Failed to create contact ticket'));
    }
  }
}
