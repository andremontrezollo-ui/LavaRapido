/**
 * Saga Orchestrator — manages multi-module process coordination.
 * Controls state transitions with compensation on failure.
 * Supports retry with exponential backoff and per-step timeouts.
 */

export type SagaStatus = 'started' | 'step_completed' | 'completed' | 'compensating' | 'compensated' | 'failed';

export interface SagaStep {
  readonly name: string;
  readonly retries?: number;
  readonly retryDelayMs?: number;
  readonly timeoutMs?: number;
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, stepName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Step '${stepName}' timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
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
        await this.executeStepWithRetry(step);
        state.completedSteps.push(step.name);
        state.status = 'step_completed';
        await this.store.save(state);
      } catch (err) {
        state.failedStep = step.name;
        state.error = err instanceof Error ? err.message : String(err);
        state.status = 'compensating';
        await this.store.save(state);

        // Compensate in reverse order (only completed steps)
        for (let j = state.completedSteps.length - 1; j >= 0; j--) {
          try {
            await steps[j].compensate();
          } catch (compErr) {
            state.status = 'failed';
            state.error += ` | Compensation failed at ${steps[j].name}: ${compErr}`;
            state.updatedAt = new Date();
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

  private async executeStepWithRetry(step: SagaStep): Promise<void> {
    const maxRetries = step.retries ?? 0;
    const baseDelay = step.retryDelayMs ?? 1000;
    const timeoutMs = step.timeoutMs;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const execution = step.execute();
        if (timeoutMs !== undefined) {
          await withTimeout(execution, timeoutMs, step.name);
        } else {
          await execution;
        }
        return;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          // Exponential backoff: delay * 2^attempt
          await delay(baseDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }
}
