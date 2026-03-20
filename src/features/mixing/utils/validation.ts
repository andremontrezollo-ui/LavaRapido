/**
 * Mixing validation utilities
 * Functions that consume Zod schemas — no React dependencies
 */

import type { Destination } from "../types/mixing.types";
import { mixingSchema } from "../schemas/mixing.schema";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the complete mixing configuration.
 * Returns {valid: true} when everything is correct, or a list of error messages.
 */
export function validateMixingConfig(
  destinations: Destination[],
  delay: number
): ValidationResult {
  const result = mixingSchema.safeParse({ destinations, delay });

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((issue) => issue.message);
  return { valid: false, errors };
}

/**
 * Returns all human-readable validation error messages for the given config.
 */
export function getValidationErrors(
  destinations: Destination[],
  delay: number
): string[] {
  return validateMixingConfig(destinations, delay).errors;
}
