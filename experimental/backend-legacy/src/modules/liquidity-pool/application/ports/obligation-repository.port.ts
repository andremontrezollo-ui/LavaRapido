import type { Obligation } from '../../domain/entities/obligation.entity';

export interface ObligationRepository {
  findById(id: string): Promise<Obligation | null>;
  findPendingByPoolId(poolId: string): Promise<Obligation[]>;
  save(obligation: Obligation): Promise<void>;
  delete(id: string): Promise<void>;
}
