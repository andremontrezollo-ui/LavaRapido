import type { ObligationRepository } from '../../application/ports/obligation-repository.port';
import type { Obligation } from '../../domain/entities/obligation.entity';

export class InMemoryObligationRepository implements ObligationRepository {
  private store = new Map<string, Obligation>();

  async findById(id: string): Promise<Obligation | null> {
    for (const o of this.store.values()) {
      if (o.id.value === id) return o;
    }
    return null;
  }

  async findPendingByPoolId(poolId: string): Promise<Obligation[]> {
    return Array.from(this.store.values()).filter(o => o.poolId === poolId && o.isPending());
  }

  async save(obligation: Obligation): Promise<void> {
    this.store.set(obligation.id.value, obligation);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
