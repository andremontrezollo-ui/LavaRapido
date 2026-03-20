/**
 * Session domain types shared across production UI and test utilities.
 */

export interface MixSession {
  sessionId: string;
  depositAddress: string;
  createdAt: Date;
  expiresAt: Date;
  status: "pending_deposit" | "processing" | "completed" | "expired";
}
