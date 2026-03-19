/**
 * MixSession Entity
 *
 * Represents a Bitcoin mixing session with lifecycle management.
 */

export type SessionStatus = 'active' | 'expired' | 'completed';

export interface MixSessionProps {
  readonly id: string;
  readonly depositAddress: string;
  readonly clientFingerprintHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly status: SessionStatus;
}

export class MixSession {
  readonly id: string;
  readonly depositAddress: string;
  readonly clientFingerprintHash: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  private _status: SessionStatus;

  constructor(props: MixSessionProps) {
    this.id = props.id;
    this.depositAddress = props.depositAddress;
    this.clientFingerprintHash = props.clientFingerprintHash;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this._status = props.status;
  }

  get status(): SessionStatus {
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

  markCompleted(): void {
    this._status = 'completed';
  }
}
