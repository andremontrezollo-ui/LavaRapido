/**
 * Contact endpoint validation and sanitization (shared across Edge Functions).
 */

export const CONTACT_VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
} as const;

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s{3,}/g, "  ");
}

export function generateTicketId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return "TKT-" + Array.from(array, (b) => chars[b % chars.length]).join("");
}

export type ContactPayload = {
  subject: string;
  message: string;
  replyContact: string;
};

export type ContactValidationResult =
  | { valid: true; data: ContactPayload }
  | { valid: false; error: string };

export function validateContactPayload(body: unknown): ContactValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const { subject, message, replyContact } = body as Record<string, unknown>;

  if (
    typeof subject !== "string" ||
    subject.trim().length < CONTACT_VALIDATION.subject.min ||
    subject.trim().length > CONTACT_VALIDATION.subject.max
  ) {
    return {
      valid: false,
      error: `Subject must be ${CONTACT_VALIDATION.subject.min}-${CONTACT_VALIDATION.subject.max} characters`,
    };
  }

  if (
    typeof message !== "string" ||
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
    replyContact !== "" &&
    typeof replyContact === "string" &&
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
      subject: sanitizeInput(subject as string),
      message: sanitizeInput(message as string),
      replyContact: typeof replyContact === "string" ? sanitizeInput(replyContact) : "",
    },
  };
}
