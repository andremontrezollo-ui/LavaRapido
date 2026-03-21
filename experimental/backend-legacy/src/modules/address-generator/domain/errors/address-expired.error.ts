/**
 * AddressExpiredError
 * 
 * Thrown when attempting to use an address that has already expired.
 */

export class AddressExpiredError extends Error {
  readonly code = 'ADDRESS_EXPIRED';

  constructor(addressId: string) {
    super(`Address "${addressId}" has expired and can no longer be used.`);
    this.name = 'AddressExpiredError';
  }
}
