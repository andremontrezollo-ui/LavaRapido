/**
 * SessionStatus Value Object
 * Enforces the valid lifecycle states of a mix session.
 */

export type SessionStatusValue = 'active' | 'expired' | 'completed' | 'cancelled';

const VALID_STATUSES: ReadonlySet<string> = new Set(['active', 'expired', 'completed', 'cancelled']);

export class SessionStatus {
  private constructor(readonly value: SessionStatusValue) {}

  static create(value: string): SessionStatus {
    if (!VALID_STATUSES.has(value)) {
      throw new Error(`Invalid session status: "${value}". Must be one of: ${[...VALID_STATUSES].join(', ')}`);
    }
    return new SessionStatus(value as SessionStatusValue);
  }

  static active(): SessionStatus {
    return new SessionStatus('active');
  }

  isActive(): boolean {
    return this.value === 'active';
  }

  isExpired(): boolean {
    return this.value === 'expired';
  }

  equals(other: SessionStatus): boolean {
    return this.value === other.value;
  }
}
