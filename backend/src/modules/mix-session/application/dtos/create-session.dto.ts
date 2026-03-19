export interface CreateSessionDto {
  clientFingerprintHash: string;
  ttlMinutes?: number;
}

export interface CreateSessionResultDto {
  sessionId: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}
