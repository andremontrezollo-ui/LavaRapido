/**
 * Address Entity
 * 
 * Represents a generated deposit address with lifecycle management.
 */

import type { BitcoinAddress } from '../value-objects/bitcoin-address.vo';
import type { AddressNamespace } from '../value-objects/address-namespace.vo';

export type AddressStatus = 'active' | 'expired' | 'used' | 'revoked';

export interface AddressProps {
  readonly id: string;
  readonly address: BitcoinAddress;
  readonly namespace: AddressNamespace;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly status: AddressStatus;
}

export class Address {
  readonly id: string;
  readonly address: BitcoinAddress;
  readonly namespace: AddressNamespace;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  private _status: AddressStatus;

  constructor(props: AddressProps) {
    this.id = props.id;
    this.address = props.address;
    this.namespace = props.namespace;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this._status = props.status;
  }

  get status(): AddressStatus {
    return this._status;
  }

  isExpired(now: Date = new Date()): boolean {
    return this._status === 'expired' || now >= this.expiresAt;
  }

  isActive(now: Date = new Date()): boolean {
    return this._status === 'active' && now < this.expiresAt;
  }

  markExpired(): void {
    this._status = 'expired';
  }

  markUsed(): void {
    this._status = 'used';
  }

  markRevoked(): void {
    this._status = 'revoked';
  }
}
