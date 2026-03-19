/**
 * Event: SessionCreated
 * Emitted when a new mix session is successfully created.
 */

export interface SessionCreatedEvent {
  readonly type: 'SESSION_CREATED';
  readonly sessionId: string;
  readonly depositAddress: string;
  readonly expiresAt: Date;
  readonly clientFingerprintHash: string;
  readonly occurredAt: Date;
}
