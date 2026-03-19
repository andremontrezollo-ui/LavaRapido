export type SessionStatus = "active" | "expired";

export interface MixSession {
  readonly id: string;
  readonly depositAddress: string;
  readonly status: SessionStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly clientFingerprintHash: string;
}

export function isExpired(session: MixSession): boolean {
  return new Date() > session.expiresAt;
}

export function resolvedStatus(session: MixSession): SessionStatus {
  return isExpired(session) ? "expired" : session.status;
}
