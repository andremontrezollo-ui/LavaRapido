/**
 * Contact Module — public exports
 */

export type { ValidatedContact, ContactValidationResult } from './domain/index';
export {
  sanitizeInput,
  generateTicketId,
  validateContactPayload,
} from './domain/index';
