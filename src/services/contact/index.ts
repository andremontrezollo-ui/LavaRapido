/**
 * Contact service — validation and payload helpers.
 *
 * Thin wrapper around the shared Zod schema so pages depend on the service,
 * not directly on the validation module.
 */

import { contactFormSchema, type ContactFormData } from "@/lib/validation";
import type { ContactPayload } from "@/api";

export type { ContactFormData };

export interface ContactValidationResult {
  success: true;
  data: ContactFormData;
}

export interface ContactValidationError {
  success: false;
  fieldErrors: Record<string, string>;
}

/**
 * Validates contact form data.
 * Returns a discriminated union — check `result.success` before accessing `data`.
 */
export function validateContactForm(
  data: ContactFormData
): ContactValidationResult | ContactValidationError {
  const result = contactFormSchema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const field = String(err.path[0]);
      fieldErrors[field] = err.message;
    });
    return { success: false, fieldErrors };
  }

  return { success: true, data: result.data };
}

/** Maps validated form data to the API payload shape. */
export function buildContactPayload(data: ContactFormData): ContactPayload {
  return {
    subject: data.subject,
    message: data.message,
    replyContact: data.replyContact || undefined,
  };
}
