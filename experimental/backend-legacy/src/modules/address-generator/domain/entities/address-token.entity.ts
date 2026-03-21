/**
 * AddressToken Entity
 * 
 * Represents a non-reusable token bound to a generated address.
 */

export interface AddressTokenProps {
  readonly tokenId: string;
  readonly addressId: string;
  readonly address: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly isConsumed: boolean;
}

export class AddressToken {
  readonly tokenId: string;
  readonly addressId: string;
  readonly address: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  private _isConsumed: boolean;

  constructor(props: AddressTokenProps) {
    this.tokenId = props.tokenId;
    this.addressId = props.addressId;
    this.address = props.address;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this._isConsumed = props.isConsumed;
  }

  get isConsumed(): boolean {
    return this._isConsumed;
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  isValid(now: Date = new Date()): boolean {
    return !this._isConsumed && !this.isExpired(now);
  }

  consume(): void {
    if (this._isConsumed) {
      throw new Error('Token already consumed');
    }
    this._isConsumed = true;
  }
}
