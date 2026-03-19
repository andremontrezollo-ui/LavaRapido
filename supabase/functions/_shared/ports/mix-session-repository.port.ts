/**
 * Port: MixSessionRepository
 * Abstracts all persistence operations for mix sessions.
 */

export interface MixSessionRecord {
  id: string;
  deposit_address: string;
  status: string;
  expires_at: string;
  created_at: string;
  client_fingerprint_hash: string;
}

export interface CreateMixSessionParams {
  depositAddress: string;
  expiresAt: string;
  clientFingerprintHash: string;
}

export interface MixSessionRepository {
  create(params: CreateMixSessionParams): Promise<MixSessionRecord>;
  findById(id: string): Promise<MixSessionRecord | null>;
  updateStatus(id: string, status: string): Promise<void>;
  markExpiredSessions(before: string): Promise<number>;
}
