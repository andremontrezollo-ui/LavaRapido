/**
 * API Validators
 * 
 * Server-side payload validation schemas.
 * These mirror client-side validation but are enforced server-side.
 */

export interface ValidationResult<T> {
  valid: true;
  data: T;
} | {
  valid: false;
  error: string;
  details?: Record<string, string>;
}

// Contact ticket validation
export interface ContactPayload {
  subject: string;
  message: string;
  replyContact: string;
}

const CONTACT_LIMITS = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
};

export function validateContactPayload(body: unknown): ValidationResult<ContactPayload> {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { subject, message, replyContact } = body as Record<string, unknown>;

  if (typeof subject !== 'string' || subject.trim().length < CONTACT_LIMITS.subject.min || subject.trim().length > CONTACT_LIMITS.subject.max) {
    return { valid: false, error: `Subject must be ${CONTACT_LIMITS.subject.min}-${CONTACT_LIMITS.subject.max} characters` };
  }

  if (typeof message !== 'string' || message.trim().length < CONTACT_LIMITS.message.min || message.trim().length > CONTACT_LIMITS.message.max) {
    return { valid: false, error: `Message must be ${CONTACT_LIMITS.message.min}-${CONTACT_LIMITS.message.max} characters` };
  }

  if (replyContact !== undefined && replyContact !== '' && typeof replyContact === 'string' && replyContact.length > CONTACT_LIMITS.replyContact.max) {
    return { valid: false, error: `Reply contact must be under ${CONTACT_LIMITS.replyContact.max} characters` };
  }

  return {
    valid: true,
    data: {
      subject: sanitize(subject as string),
      message: sanitize(message as string),
      replyContact: typeof replyContact === 'string' ? sanitize(replyContact) : '',
    },
  };
}

// Session status validation
export interface SessionStatusPayload {
  sessionId: string;
}

export function validateSessionId(body: unknown): ValidationResult<SessionStatusPayload> {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { sessionId } = body as Record<string, unknown>;

  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/.test(sessionId)) {
    return { valid: false, error: 'Invalid session ID format' };
  }

  return { valid: true, data: { sessionId } };
}

function sanitize(input: string): string {
  return input
    .trim()
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s{3,}/g, '  ');
}
