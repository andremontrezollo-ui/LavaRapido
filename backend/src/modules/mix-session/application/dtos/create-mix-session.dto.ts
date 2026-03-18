export interface CreateMixSessionRequest {
  clientIp: string;
}

export interface CreateMixSessionResponse {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}
