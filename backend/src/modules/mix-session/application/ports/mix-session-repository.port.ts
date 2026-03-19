export interface MixSession {
  id: string;
  depositAddress: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

export interface MixSessionRepository {
  create(data: { depositAddress: string; expiresAt: string; ipHash: string }): Promise<MixSession>;
  findById(id: string): Promise<MixSession | null>;
  markExpired(id: string): Promise<void>;
}
