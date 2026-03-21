/**
 * In-Memory Saga Store.
 */

import type { SagaState, SagaStore } from './saga-orchestrator';

export class InMemorySagaStore implements SagaStore {
  private sagas = new Map<string, SagaState>();

  async save(state: SagaState): Promise<void> {
    this.sagas.set(state.sagaId, { ...state, completedSteps: [...state.completedSteps] });
  }

  async findById(sagaId: string): Promise<SagaState | null> {
    return this.sagas.get(sagaId) ?? null;
  }

  async findActive(): Promise<SagaState[]> {
    return Array.from(this.sagas.values()).filter(
      s => s.status === 'started' || s.status === 'step_completed' || s.status === 'compensating',
    );
  }

  clear(): void { this.sagas.clear(); }
}
