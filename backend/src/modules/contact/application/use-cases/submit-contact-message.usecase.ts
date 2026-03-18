/**
 * SubmitContactMessage — application use case.
 *
 * Business rules:
 * - Rate limit: max 5 tickets per 10 minutes per IP fingerprint
 * - Subject: 3–100 chars after trimming
 * - Message: 10–2000 chars after trimming
 * - ReplyContact: optional, max 500 chars
 * - All text fields are sanitized before persistence
 */
import type { UseCase } from '../../../../shared/application/UseCase.ts';
import type { ContactRepository } from '../ports/contact-repository.port.ts';
import type { RateLimitRepository } from '../../../mix-session/application/ports/rate-limit-repository.port.ts';
import type { SubmitContactRequest, SubmitContactResponse } from '../dtos/submit-contact.dto.ts';
import { CONTACT_LIMITS } from '../dtos/submit-contact.dto.ts';
import { ContactTicket } from '../../domain/entities/contact-ticket.entity.ts';
import { sha256Hex } from '../../../../shared/utils/crypto.ts';

const RATE_LIMIT = { endpoint: 'contact', maxRequests: 5, windowSeconds: 600 };

export class ContactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContactValidationError';
  }
}

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitExceededError';
  }
}

export class SubmitContactMessageUseCase implements UseCase<SubmitContactRequest, SubmitContactResponse> {
  constructor(
    private readonly contactRepo: ContactRepository,
    private readonly rateLimitRepo: RateLimitRepository,
  ) {}

  async execute(request: SubmitContactRequest): Promise<SubmitContactResponse> {
    const ipHash = await sha256Hex(request.clientIp);

    const rl = await this.rateLimitRepo.check(ipHash, RATE_LIMIT);
    if (!rl.allowed) {
      throw new RateLimitExceededError(rl.retryAfterSeconds);
    }

    this.validate(request);

    await this.rateLimitRepo.record(ipHash, RATE_LIMIT.endpoint);

    const ticket = await this.contactRepo.create({
      ticketId: ContactTicket.generateTicketId(),
      subject: ContactTicket.sanitize(request.subject),
      message: ContactTicket.sanitize(request.message),
      replyContact: request.replyContact ? ContactTicket.sanitize(request.replyContact) : null,
      ipHash,
      createdAt: new Date(),
    });

    return {
      ticketId: ticket.ticketId,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  private validate(request: SubmitContactRequest): void {
    const subject = request.subject?.trim() ?? '';
    const message = request.message?.trim() ?? '';
    const replyContact = request.replyContact ?? '';

    if (subject.length < CONTACT_LIMITS.subject.min || subject.length > CONTACT_LIMITS.subject.max) {
      throw new ContactValidationError(
        `Subject must be ${CONTACT_LIMITS.subject.min}–${CONTACT_LIMITS.subject.max} characters`,
      );
    }
    if (message.length < CONTACT_LIMITS.message.min || message.length > CONTACT_LIMITS.message.max) {
      throw new ContactValidationError(
        `Message must be ${CONTACT_LIMITS.message.min}–${CONTACT_LIMITS.message.max} characters`,
      );
    }
    if (replyContact.length > CONTACT_LIMITS.replyContact.max) {
      throw new ContactValidationError(
        `Reply contact must be under ${CONTACT_LIMITS.replyContact.max} characters`,
      );
    }
  }
}
