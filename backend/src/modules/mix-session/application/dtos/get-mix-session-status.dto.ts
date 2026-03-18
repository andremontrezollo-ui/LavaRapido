export interface GetMixSessionStatusRequest {
  sessionId: string;
}

export interface GetMixSessionStatusResponse {
  sessionId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}
