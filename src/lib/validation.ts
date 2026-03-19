/**
 * Input validation utilities
 * Provides secure validation for user inputs
 */

import { z } from "zod";
import { BITCOIN_ADDRESS_PATTERNS, VALIDATION_LIMITS } from "./constants";

/**
 * Validates a Bitcoin address format
 * Supports Legacy (P2PKH), P2SH, Bech32 (SegWit), and Bech32m (Taproot)
 */
export function isValidBitcoinAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  const trimmed = address.trim();
  
  if (
    trimmed.length < VALIDATION_LIMITS.bitcoinAddress.minLength ||
    trimmed.length > VALIDATION_LIMITS.bitcoinAddress.maxLength
  ) {
    return false;
  }

  return (
    BITCOIN_ADDRESS_PATTERNS.legacy.test(trimmed) ||
    BITCOIN_ADDRESS_PATTERNS.p2sh.test(trimmed) ||
    BITCOIN_ADDRESS_PATTERNS.bech32.test(trimmed) ||
    BITCOIN_ADDRESS_PATTERNS.bech32m.test(trimmed)
  );
}

/**
 * Sanitizes a string input by removing potentially dangerous characters
 * while preserving legitimate text
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters except newlines and tabs
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Limit consecutive whitespace
    .replace(/\s{3,}/g, "  ");
}

/**
 * Contact form validation schema
 */
export const contactFormSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.subject.minLength, {
      message: `Subject must be at least ${VALIDATION_LIMITS.subject.minLength} characters`,
    })
    .max(VALIDATION_LIMITS.subject.maxLength, {
      message: `Subject must be less than ${VALIDATION_LIMITS.subject.maxLength} characters`,
    })
    .transform(sanitizeInput),
  message: z
    .string()
    .trim()
    .min(VALIDATION_LIMITS.message.minLength, {
      message: `Message must be at least ${VALIDATION_LIMITS.message.minLength} characters`,
    })
    .max(VALIDATION_LIMITS.message.maxLength, {
      message: `Message must be less than ${VALIDATION_LIMITS.message.maxLength} characters`,
    })
    .transform(sanitizeInput),
  replyContact: z
    .string()
    .max(VALIDATION_LIMITS.replyContact.maxLength, {
      message: `Contact info must be less than ${VALIDATION_LIMITS.replyContact.maxLength} characters`,
    })
    .transform(sanitizeInput)
    .optional()
    .or(z.literal("")),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

/**
 * Destination address validation schema
 */
export const destinationSchema = z.object({
  id: z.string(),
  address: z
    .string()
    .trim()
    .refine(isValidBitcoinAddress, {
      message: "Invalid Bitcoin address format",
    }),
  percentage: z.number().min(10).max(100),
});

export type DestinationData = z.infer<typeof destinationSchema>;

/**
 * Mixing configuration validation schema
 */
export const mixingConfigSchema = z.object({
  destinations: z.array(destinationSchema).min(1).max(5),
  delay: z.number().min(0).max(24),
});

export type MixingConfigData = z.infer<typeof mixingConfigSchema>;

/**
 * Generates a secure random ticket ID
 */
export function generateTicketId(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars
  let result = "TKT-";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < 6; i++) {
    result += characters[array[i] % characters.length];
  }
  
  return result;
}
