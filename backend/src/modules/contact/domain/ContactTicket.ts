/**
 * ContactTicket — domain entity and helpers.
 *
 * All business rules for contact form submission live here:
 * validation constraints, input sanitisation, and ticket ID generation.
 */

export interface ContactTicket {
  ticketId: string;
  subject: string;
  message: string;
  replyContact: string | null;
  ipHash: string;
  createdAt: Date;
}

/** Validation constraints for contact form fields. */
export const CONTACT_VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
} as const;

/**
 * Strip null bytes, dangerous control characters, and collapse
 * excessive whitespace from a string. Does NOT strip newlines (\n, \r).
 */
export function sanitizeContactInput(input: string): string {
  return input
    .trim()
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s{3,}/g, '  ');
}

/** Charset excludes visually ambiguous characters (0, O, 1, I). */
const TICKET_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 6-character alphanumeric ticket ID in the form TKT-XXXXXX.
 * Uses Web Crypto API (Deno + Node.js 15+).
 */
export function generateTicketId(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return 'TKT-' + Array.from(array, (b) => TICKET_CHARSET[b % TICKET_CHARSET.length]).join('');
}

export type ContactValidationResult =
  | { valid: true; data: { subject: string; message: string; replyContact: string } }
  | { valid: false; error: string };

/**
 * Validate and sanitise the raw contact form payload.
 *
 * Accepts an arbitrary `unknown` object so it can be called directly with
 * the parsed HTTP request body.
 */
export function validateContactPayload(payload: unknown): ContactValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { subject, message, replyContact } = payload as Record<string, unknown>;

  if (
    typeof subject !== 'string' ||
    subject.trim().length < CONTACT_VALIDATION.subject.min ||
    subject.trim().length > CONTACT_VALIDATION.subject.max
  ) {
    return {
      valid: false,
      error: `Subject must be ${CONTACT_VALIDATION.subject.min}-${CONTACT_VALIDATION.subject.max} characters`,
    };
  }

  if (
    typeof message !== 'string' ||
    message.trim().length < CONTACT_VALIDATION.message.min ||
    message.trim().length > CONTACT_VALIDATION.message.max
  ) {
    return {
      valid: false,
      error: `Message must be ${CONTACT_VALIDATION.message.min}-${CONTACT_VALIDATION.message.max} characters`,
    };
  }

  if (
    replyContact !== undefined &&
    replyContact !== '' &&
    typeof replyContact === 'string' &&
    replyContact.length > CONTACT_VALIDATION.replyContact.max
  ) {
    return {
      valid: false,
      error: `Reply contact must be under ${CONTACT_VALIDATION.replyContact.max} characters`,
    };
  }

  return {
    valid: true,
    data: {
      subject: sanitizeContactInput(subject),
      message: sanitizeContactInput(message),
      replyContact: typeof replyContact === 'string' ? sanitizeContactInput(replyContact) : '',
    },
  };
}
