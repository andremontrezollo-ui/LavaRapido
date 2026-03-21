/**
 * Saga Orchestrator — manages multi-module process coordination.
 * Controls state transitions with compensation on failure.
 */

export type SagaStatus = 'started' | 'step_completed' | 'completed' | 'compensating' | 'compensated' | 'failed';

export interface SagaStep {
  readonly name: string;
  execute(): Promise<void>;
  compensate(): Promise<void>;
}

export interface SagaState {
  readonly sagaId: string;
  readonly name: string;
  status: SagaStatus;
  currentStep: number;
  completedSteps: string[];
  failedStep: string | null;
  error: string | null;
  startedAt: Date;
  updatedAt: Date;
}

export interface SagaStore {
  save(state: SagaState): Promise<void>;
  findById(sagaId: string): Promise<SagaState | null>;
  findActive(): Promise<SagaState[]>;
}

export class SagaOrchestrator {
  constructor(
    private readonly store: SagaStore,
    private readonly idGenerator: { generate(): string },
  ) {}

  async execute(name: string, steps: SagaStep[]): Promise<SagaState> {
    const sagaId = this.idGenerator.generate();
    const now = new Date();
    const state: SagaState = {
      sagaId,
      name,
      status: 'started',
      currentStep: 0,
      completedSteps: [],
      failedStep: null,
      error: null,
      startedAt: now,
      updatedAt: now,
    };

    await this.store.save(state);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      state.currentStep = i;
      state.updatedAt = new Date();

      try {
        await step.execute();
        state.completedSteps.push(step.name);
        state.status = 'step_completed';
        await this.store.save(state);
      } catch (err) {
        state.failedStep = step.name;
        state.error = err instanceof Error ? err.message : String(err);
        state.status = 'compensating';
        await this.store.save(state);

        // Compensate in reverse order
        for (let j = state.completedSteps.length - 1; j >= 0; j--) {
          try {
            await steps[j].compensate();
          } catch (compErr) {
            state.status = 'failed';
            state.error += ` | Compensation failed at ${steps[j].name}: ${compErr}`;
            await this.store.save(state);
            return state;
          }
        }

        state.status = 'compensated';
        state.updatedAt = new Date();
        await this.store.save(state);
        return state;
      }
    }

    state.status = 'completed';
    state.updatedAt = new Date();
    await this.store.save(state);
    return state;
  }
}
