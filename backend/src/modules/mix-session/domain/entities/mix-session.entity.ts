/**
 * MixSession — aggregate root for a Bitcoin mixing session.
 *
 * Encapsulates the lifecycle of a single mixing request: from creation
 * through expiry or completion.
 */
export type SessionStatus = 'active' | 'expired' | 'completed';

export class MixSession {
  constructor(
    public readonly id: string,
    public readonly depositAddress: string,
    public readonly status: SessionStatus,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
    public readonly clientFingerprintHash: string,
  ) {}

  isExpired(now: Date = new Date()): boolean {
    return now >= this.expiresAt;
  }

  withStatus(status: SessionStatus): MixSession {
    return new MixSession(
      this.id,
      this.depositAddress,
      status,
      this.createdAt,
      this.expiresAt,
      this.clientFingerprintHash,
    );
  }
}
