/**
 * MixSessionCreated Domain Event
 */

export interface MixSessionCreatedEvent {
  readonly type: 'MIX_SESSION_CREATED';
  readonly sessionId: string;
  readonly depositAddress: string;
  readonly expiresAt: string;
  readonly occurredAt: string;
}

export function createMixSessionCreatedEvent(
  sessionId: string,
  depositAddress: string,
  expiresAt: Date,
): MixSessionCreatedEvent {
  return {
    type: 'MIX_SESSION_CREATED',
    sessionId,
    depositAddress,
    expiresAt: expiresAt.toISOString(),
    occurredAt: new Date().toISOString(),
  };
}
