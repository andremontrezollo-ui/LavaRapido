/**
 * Saga Recovery Tests
 * Verifies compensation logic, state persistence across steps,
 * and recovery after simulated process restart.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySagaStore } from '../../src/test-utils/in-memory-saga-store';
import { SagaOrchestrator } from '../../src/infra/saga/saga-orchestrator';
import type { SagaStep } from '../../src/infra/saga/saga-orchestrator';

let idCounter = 0;
const idGenerator = { generate: () => `saga-${++idCounter}` };

const successStep = (name: string): SagaStep => ({
  name,
  execute: async () => {},
  compensate: async () => {},
});

const failingStep = (name: string, error = 'forced failure'): SagaStep => ({
  name,
  execute: async () => { throw new Error(error); },
  compensate: async () => {},
});

describe('Saga recovery', () => {
  let store: InMemorySagaStore;
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    store = new InMemorySagaStore();
    orchestrator = new SagaOrchestrator(store, idGenerator);
  });

  it('completes a happy-path saga with all steps', async () => {
    const state = await orchestrator.execute('test-saga', [
      successStep('step-1'),
      successStep('step-2'),
      successStep('step-3'),
    ]);

    expect(state.status).toBe('completed');
    expect(state.completedSteps).toEqual(['step-1', 'step-2', 'step-3']);
  });

  it('persists saga state after each step', async () => {
    const state = await orchestrator.execute('persist-saga', [
      successStep('s1'),
      successStep('s2'),
    ]);

    const persisted = await store.findById(state.sagaId);
    expect(persisted).not.toBeNull();
    expect(persisted!.status).toBe('completed');
  });

  it('compensates completed steps on failure', async () => {
    const compensated: string[] = [];
    const trackedSuccessStep = (name: string): SagaStep => ({
      name,
      execute: async () => {},
      compensate: async () => { compensated.push(name); },
    });

    const state = await orchestrator.execute('comp-saga', [
      trackedSuccessStep('step-1'),
      trackedSuccessStep('step-2'),
      failingStep('step-3'),
    ]);

    expect(state.status).toBe('compensated');
    expect(state.failedStep).toBe('step-3');
    // Compensation runs in reverse
    expect(compensated).toEqual(['step-2', 'step-1']);
  });

  it('stores failed saga state with error details', async () => {
    const state = await orchestrator.execute('fail-saga', [
      successStep('ok-step'),
      failingStep('bad-step', 'database error'),
    ]);

    expect(state.status).toBe('compensated');
    expect(state.error).toContain('database error');
  });

  it('findActive returns only in-progress sagas', async () => {
    // Run one saga to completion
    await orchestrator.execute('done-saga', [successStep('s1')]);

    // Manually save an active saga to the store
    await store.save({
      sagaId: 'active-saga',
      name: 'in-progress',
      status: 'started',
      currentStep: 0,
      completedSteps: [],
      failedStep: null,
      error: null,
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const active = await store.findActive();
    expect(active.map(s => s.sagaId)).toContain('active-saga');
    expect(active.find(s => s.name === 'done-saga')).toBeUndefined();
  });

  it('simulates restart: existing saga state is recoverable', async () => {
    const state = await orchestrator.execute('restart-saga', [
      successStep('completed-step'),
      failingStep('crash-step'),
    ]);

    // After restart, find the saga and inspect
    const recovered = await store.findById(state.sagaId);
    expect(recovered).not.toBeNull();
    expect(recovered!.failedStep).toBe('crash-step');
  });

  it('duplicate sagaId upserts correctly (idempotent save)', async () => {
    const sagaId = 'idempotent-saga';
    await store.save({
      sagaId,
      name: 'test',
      status: 'started',
      currentStep: 0,
      completedSteps: [],
      failedStep: null,
      error: null,
      startedAt: new Date(),
      updatedAt: new Date(),
    });
    await store.save({
      sagaId,
      name: 'test',
      status: 'completed',
      currentStep: 1,
      completedSteps: ['s1'],
      failedStep: null,
      error: null,
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const found = await store.findById(sagaId);
    expect(found!.status).toBe('completed');
  });
});
