export interface MixSessionResponse {
  readonly sessionId: string;
  readonly depositAddress: string;
  readonly status: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}
