/**
 * MixSession Entity
 * Represents a Bitcoin mixing session: a binding between a deposit address,
 * a status lifecycle, and an expiry window.
 */

export type MixSessionStatus = 'active' | 'expired' | 'completed';

export interface MixSessionProps {
  id: string;
  depositAddress: string;
  status: MixSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  clientFingerprintHash: string;
}

export class MixSession {
  readonly id: string;
  readonly depositAddress: string;
  readonly status: MixSessionStatus;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly clientFingerprintHash: string;

  constructor(props: MixSessionProps) {
    this.id = props.id;
    this.depositAddress = props.depositAddress;
    this.status = props.status;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
    this.clientFingerprintHash = props.clientFingerprintHash;
  }

  isExpired(now: Date = new Date()): boolean {
    return now > this.expiresAt;
  }

  resolvedStatus(now: Date = new Date()): MixSessionStatus {
    return this.isExpired(now) ? 'expired' : this.status;
  }
}
