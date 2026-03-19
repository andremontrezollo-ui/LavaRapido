/**
 * Contact Domain Logic
 *
 * CORE business rules for contact ticket submission: input sanitization,
 * payload validation, and ticket-ID generation.
 * This is the canonical source of truth — consumed by the HTTP entry layer
 * (supabase/functions) as a thin adapter.
 *
 * Intentionally self-contained (no internal imports) so it can be imported
 * from both the Node.js backend and the Deno edge-function runtime.
 */

// ---------------------------------------------------------------------------
// Validation constraints
// ---------------------------------------------------------------------------

const VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
} as const;

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

/**
 * Strip null bytes, non-printable control characters and collapse excessive
 * whitespace runs.  Returns a safe, trimmed string.
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s{3,}/g, '  ');
}

// ---------------------------------------------------------------------------
// Ticket-ID generation
// ---------------------------------------------------------------------------

/** Unambiguous uppercase alphanumeric character set for human-readable IDs */
const TICKET_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random, human-readable support ticket identifier.
 * Format: `TKT-XXXXXX`
 */
export function generateTicketId(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return 'TKT-' + Array.from(array, (b) => TICKET_CHARS[b % TICKET_CHARS.length]).join('');
}

// ---------------------------------------------------------------------------
// Payload validation
// ---------------------------------------------------------------------------

export interface ValidatedContact {
  subject: string;
  message: string;
  replyContact: string;
}

export type ContactValidationResult =
  | { valid: true; data: ValidatedContact }
  | { valid: false; error: string };

/**
 * Validate and sanitize a raw contact-form payload.
 * Returns either validated + sanitized data or a descriptive error message.
 */
export function validateContactPayload(body: unknown): ContactValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { subject, message, replyContact } = body as Record<string, unknown>;

  if (
    typeof subject !== 'string' ||
    subject.trim().length < VALIDATION.subject.min ||
    subject.trim().length > VALIDATION.subject.max
  ) {
    return {
      valid: false,
      error: `Subject must be ${VALIDATION.subject.min}-${VALIDATION.subject.max} characters`,
    };
  }

  if (
    typeof message !== 'string' ||
    message.trim().length < VALIDATION.message.min ||
    message.trim().length > VALIDATION.message.max
  ) {
    return {
      valid: false,
      error: `Message must be ${VALIDATION.message.min}-${VALIDATION.message.max} characters`,
    };
  }

  if (
    replyContact !== undefined &&
    replyContact !== '' &&
    typeof replyContact === 'string' &&
    replyContact.length > VALIDATION.replyContact.max
  ) {
    return {
      valid: false,
      error: `Reply contact must be under ${VALIDATION.replyContact.max} characters`,
    };
  }

  return {
    valid: true,
    data: {
      subject: sanitizeInput(subject as string),
      message: sanitizeInput(message as string),
      replyContact: typeof replyContact === 'string' ? sanitizeInput(replyContact) : '',
    },
  };
}
