/**
 * Error: InvalidContactPayload
 * Thrown when a contact form submission fails domain validation.
 */

export class InvalidContactPayloadError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'InvalidContactPayloadError';
    this.field = field;
  }
}
