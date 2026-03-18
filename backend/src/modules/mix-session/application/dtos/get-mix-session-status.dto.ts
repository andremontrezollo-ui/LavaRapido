/** DTO for GetMixSessionStatus input */
export interface GetMixSessionStatusRequest {
  sessionId: string;
}

/** DTO for GetMixSessionStatus output */
export interface GetMixSessionStatusResponse {
  sessionId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}
