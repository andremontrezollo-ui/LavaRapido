/** DTO for CreateMixSession input */
export interface CreateMixSessionRequest {
  /** SHA-256 hash of the client IP (for rate limiting & privacy). */
  clientFingerprintHash: string;
}

/** DTO for CreateMixSession output */
export interface CreateMixSessionResponse {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}
