/**
 * Use Case: CreateContactTicket
 *
 * Responsibilities:
 * - Validate and sanitize contact form payload
 * - Enforce rate limit via RateLimitRepository
 * - Generate a unique ticket ID
 * - Persist ticket via ContactRepository
 *
 * Does NOT know about HTTP, Supabase client, or Deno.serve.
 */

import type { ContactRepository } from "../ports/contact-repository.port.ts";
import type { RateLimitRepository } from "../ports/rate-limit-repository.port.ts";

const VALIDATION = {
  subject: { min: 3, max: 100 },
  message: { min: 10, max: 2000 },
  replyContact: { max: 500 },
} as const;

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 600;
const TICKET_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s{3,}/g, "  ");
}

export function generateTicketId(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return "TKT-" + Array.from(array, (b) => TICKET_CHARS[b % TICKET_CHARS.length]).join("");
}

export interface ContactPayload {
  subject: string;
  message: string;
  replyContact?: string;
}

export type ValidationResult =
  | { valid: true; data: { subject: string; message: string; replyContact: string } }
  | { valid: false; error: string };

export function validateContactPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") return { valid: false, error: "Invalid request body" };
  const { subject, message, replyContact } = body as Record<string, unknown>;

  if (
    typeof subject !== "string" ||
    subject.trim().length < VALIDATION.subject.min ||
    subject.trim().length > VALIDATION.subject.max
  ) {
    return {
      valid: false,
      error: `Subject must be ${VALIDATION.subject.min}-${VALIDATION.subject.max} characters`,
    };
  }
  if (
    typeof message !== "string" ||
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
    replyContact !== "" &&
    typeof replyContact === "string" &&
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
      replyContact: typeof replyContact === "string" ? sanitizeInput(replyContact) : "",
    },
  };
}

export interface CreateContactTicketInput {
  ipHash: string;
  body: unknown;
}

export type RateLimitDenied = { allowed: false; retryAfterSeconds: number };
export type CreateContactTicketResult =
  | RateLimitDenied
  | { allowed: true; validationError: string; ticket: undefined }
  | { allowed: true; validationError: undefined; ticket: { ticketId: string; createdAt: string } };

export async function createContactTicketUseCase(
  input: CreateContactTicketInput,
  contactRepo: ContactRepository,
  rateLimitRepo: RateLimitRepository,
): Promise<CreateContactTicketResult> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const count = await rateLimitRepo.count(input.ipHash, "contact", windowStart);

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: RATE_LIMIT_WINDOW_SECONDS };
  }

  const validation = validateContactPayload(input.body);
  if (!validation.valid) {
    return { allowed: true, validationError: validation.error, ticket: undefined };
  }

  await rateLimitRepo.record(input.ipHash, "contact");

  const ticketId = generateTicketId();
  const record = await contactRepo.create({
    ticketId,
    subject: validation.data.subject,
    message: validation.data.message,
    replyContact: validation.data.replyContact || null,
    ipHash: input.ipHash,
  });

  return {
    allowed: true,
    validationError: undefined,
    ticket: { ticketId: record.ticket_id, createdAt: record.created_at },
  };
}
