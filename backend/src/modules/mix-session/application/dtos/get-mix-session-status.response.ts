export interface GetMixSessionStatusResponse {
  readonly sessionId: string;
  readonly status: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}
