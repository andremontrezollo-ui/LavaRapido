/**
 * DTO Validation Schemas — centralized input validation.
 */

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationSuccess<T> {
  valid: true;
  data: T;
}

interface ValidationFailure {
  valid: false;
  errors: ValidationError[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// Mix session creation
export interface CreateMixSessionInput {
  destinations: string[];
  amount: number;
  delayMinutes: number;
}

export function validateCreateMixSession(body: unknown): ValidationResult<CreateMixSessionInput> {
  const errors: ValidationError[] = [];
  if (!body || typeof body !== 'object') return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] };
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.destinations) || b.destinations.length === 0 || b.destinations.length > 10) {
    errors.push({ field: 'destinations', message: 'Must be 1-10 destination addresses' });
  } else {
    for (const d of b.destinations) {
      if (typeof d !== 'string' || d.length < 26 || d.length > 90) {
        errors.push({ field: 'destinations', message: 'Invalid address format' });
        break;
      }
    }
  }

  if (typeof b.amount !== 'number' || b.amount <= 0 || b.amount > 21_000_000) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number ≤ 21M' });
  }

  if (typeof b.delayMinutes !== 'number' || b.delayMinutes < 0 || b.delayMinutes > 1440) {
    errors.push({ field: 'delayMinutes', message: 'Delay must be 0-1440 minutes' });
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    data: {
      destinations: (b.destinations as string[]).map(s => s.trim()),
      amount: b.amount as number,
      delayMinutes: b.delayMinutes as number,
    },
  };
}

// Contact ticket
export interface ContactInput {
  subject: string;
  message: string;
  replyContact?: string;
}

export function validateContact(body: unknown): ValidationResult<ContactInput> {
  const errors: ValidationError[] = [];
  if (!body || typeof body !== 'object') return { valid: false, errors: [{ field: 'body', message: 'Invalid request body' }] };
  const b = body as Record<string, unknown>;

  if (typeof b.subject !== 'string' || b.subject.trim().length < 3 || b.subject.trim().length > 100) {
    errors.push({ field: 'subject', message: 'Subject must be 3-100 characters' });
  }

  if (typeof b.message !== 'string' || b.message.trim().length < 10 || b.message.trim().length > 2000) {
    errors.push({ field: 'message', message: 'Message must be 10-2000 characters' });
  }

  if (b.replyContact !== undefined && typeof b.replyContact === 'string' && b.replyContact.length > 500) {
    errors.push({ field: 'replyContact', message: 'Reply contact must be under 500 characters' });
  }

  if (errors.length > 0) return { valid: false, errors };
  return {
    valid: true,
    data: {
      subject: sanitize((b.subject as string).trim()),
      message: sanitize((b.message as string).trim()),
      replyContact: typeof b.replyContact === 'string' ? sanitize(b.replyContact.trim()) : undefined,
    },
  };
}

function sanitize(input: string): string {
  return input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\s{3,}/g, '  ');
}
