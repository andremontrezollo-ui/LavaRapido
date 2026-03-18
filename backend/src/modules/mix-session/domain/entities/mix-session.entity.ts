/**
 * MixSession Entity
 *
 * Aggregate root for a Bitcoin mixing session.
 * Invariant: a session may not transition from 'expired' or 'completed' back to 'active'.
 */

import { SessionStatus } from '../value-objects/session-status.vo';
import { DepositAddress } from '../value-objects/deposit-address.vo';

export interface MixSessionProps {
  id: string;
  depositAddress: DepositAddress;
  status: SessionStatus;
  clientFingerprintHash: string;
  createdAt: Date;
  expiresAt: Date;
}

export class MixSession {
  readonly id: string;
  readonly depositAddress: DepositAddress;
  private _status: SessionStatus;
  readonly clientFingerprintHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;

  constructor(props: MixSessionProps) {
    this.id = props.id;
    this.depositAddress = props.depositAddress;
    this._status = props.status;
    this.clientFingerprintHash = props.clientFingerprintHash;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
  }

  get status(): SessionStatus {
    return this._status;
  }

  /** Returns true if the session is past its expiry date. */
  isExpiredAt(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  /** Mark session as expired. Throws if already in a terminal state. */
  markExpired(): void {
    if (this._status.value === 'completed' || this._status.value === 'cancelled') {
      throw new Error(`Cannot expire session in state "${this._status.value}"`);
    }
    this._status = SessionStatus.create('expired');
  }

  /** Compute the effective status (accounts for time-based expiry). */
  effectiveStatus(now: Date = new Date()): SessionStatus {
    if (this._status.isActive() && this.isExpiredAt(now)) {
      return SessionStatus.create('expired');
    }
    return this._status;
  }
}
