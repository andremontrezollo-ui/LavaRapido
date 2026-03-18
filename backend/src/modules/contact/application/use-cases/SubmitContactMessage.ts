/**
 * SubmitContactMessage — use case.
 *
 * Business rules:
 *  - Rate limit: max 5 tickets per 10 minutes per IP hash.
 *  - Subject must be 3-100 characters.
 *  - Message must be 10-2000 characters.
 *  - Reply contact is optional, max 500 characters.
 *  - Inputs are sanitised before storage.
 *  - A unique TKT-XXXXXX ticket ID is generated per submission.
 */

import { validateContactPayload, generateTicketId } from '../../domain/ContactTicket.ts';
import type { ContactRepository } from '../ports/ContactRepository.ts';
import type { RateLimitRepository } from '../../../../shared/ports/RateLimitRepository.ts';

export interface SubmitContactMessageInput {
  /** SHA-256 hash of the client IP address. */
  ipHash: string;
  subject: unknown;
  message: unknown;
  replyContact?: unknown;
}

export interface SubmitContactMessageOutput {
  ticketId: string;
  createdAt: string;
}

export class SubmitContactMessageError extends Error {
  constructor(
    public readonly code: 'RATE_LIMITED' | 'VALIDATION_ERROR' | 'INTERNAL',
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'SubmitContactMessageError';
  }
}

/** Rate-limit config for contact submissions. */
const RATE_LIMIT_CONFIG = {
  endpoint: 'contact',
  maxRequests: 5,
  windowSeconds: 600,
} as const;

export class SubmitContactMessageUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly rateLimits: RateLimitRepository,
  ) {}

  async execute(input: SubmitContactMessageInput): Promise<SubmitContactMessageOutput> {
    const rl = await this.rateLimits.check(input.ipHash, RATE_LIMIT_CONFIG);

    if (!rl.allowed) {
      throw new SubmitContactMessageError(
        'RATE_LIMITED',
        'Rate limit exceeded',
        rl.retryAfterSeconds,
      );
    }

    const validation = validateContactPayload({
      subject: input.subject,
      message: input.message,
      replyContact: input.replyContact,
    });

    if (!validation.valid) {
      throw new SubmitContactMessageError('VALIDATION_ERROR', validation.error);
    }

    // Record rate-limit entry only after successful validation
    await this.rateLimits.record(input.ipHash, RATE_LIMIT_CONFIG.endpoint);

    const ticketId = generateTicketId();

    const ticket = await this.contacts.save({
      ticketId,
      subject: validation.data.subject,
      message: validation.data.message,
      replyContact: validation.data.replyContact || null,
      ipHash: input.ipHash,
    });

    return {
      ticketId: ticket.ticketId,
      createdAt: ticket.createdAt.toISOString(),
    };
  }
}
