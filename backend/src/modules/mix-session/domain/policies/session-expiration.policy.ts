/**
 * SessionExpirationPolicy
 * Defines the default TTL for a mix session and whether a session may be created.
 */

export const SESSION_TTL_MINUTES = 30;

export class SessionExpirationPolicy {
  /** Returns the expiry date given a creation time. */
  expiresAt(createdAt: Date, ttlMinutes: number = SESSION_TTL_MINUTES): Date {
    return new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);
  }
}
