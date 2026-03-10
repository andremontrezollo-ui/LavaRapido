/**
 * Integration test: Saga recovery after partial failures.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySagaStore } from '../../src/test-utils/InMemorySagaStore';
import { SagaOrchestrator } from '../../src/infra/saga/saga-orchestrator';
import type { SagaStep } from '../../src/infra/saga/saga-orchestrator';

function makeIdGen(id: string) {
  return { generate: () => id };
}

describe('Saga Recovery', () => {
  let store: InMemorySagaStore;
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    store = new InMemorySagaStore();
    orchestrator = new SagaOrchestrator(store, makeIdGen('saga-1'));
  });

  it('should complete saga when all steps succeed', async () => {
    const executed: string[] = [];
    const steps: SagaStep[] = [
      { name: 'step-a', execute: async () => { executed.push('a'); }, compensate: async () => {} },
      { name: 'step-b', execute: async () => { executed.push('b'); }, compensate: async () => {} },
    ];

    const state = await orchestrator.execute('test-saga', steps);

    expect(state.status).toBe('completed');
    expect(executed).toEqual(['a', 'b']);
    expect(state.completedSteps).toEqual(['step-a', 'step-b']);
  });

  it('should compensate completed steps when a step fails', async () => {
    const compensated: string[] = [];
    const steps: SagaStep[] = [
      {
        name: 'step-a',
        execute: async () => {},
        compensate: async () => { compensated.push('a'); },
      },
      {
        name: 'step-b',
        execute: async () => { throw new Error('step-b failed'); },
        compensate: async () => { compensated.push('b'); },
      },
    ];

    const state = await orchestrator.execute('failing-saga', steps);

    expect(state.status).toBe('compensated');
    expect(state.failedStep).toBe('step-b');
    expect(compensated).toEqual(['a']);
  });

  it('should persist saga state in store', async () => {
    const steps: SagaStep[] = [
      { name: 'step-a', execute: async () => {}, compensate: async () => {} },
    ];

    const state = await orchestrator.execute('persisted-saga', steps);
    const found = await store.findById(state.sagaId);

    expect(found).not.toBeNull();
    expect(found?.status).toBe('completed');
  });

  it('should find active sagas', async () => {
    // Manually save an active saga
    const now = new Date();
    await store.save({
      sagaId: 'active-1',
      name: 'active-saga',
      status: 'started',
      currentStep: 0,
      completedSteps: [],
      failedStep: null,
      error: null,
      startedAt: now,
      updatedAt: now,
    });
    await store.save({
      sagaId: 'completed-1',
      name: 'done-saga',
      status: 'completed',
      currentStep: 1,
      completedSteps: ['step-a'],
      failedStep: null,
      error: null,
      startedAt: now,
      updatedAt: now,
    });

    const active = await store.findActive();
    expect(active.length).toBe(1);
    expect(active[0].sagaId).toBe('active-1');
  });

  it('should handle compensation failure gracefully', async () => {
    const steps: SagaStep[] = [
      {
        name: 'step-a',
        execute: async () => {},
        compensate: async () => { throw new Error('compensation failed'); },
      },
      {
        name: 'step-b',
        execute: async () => { throw new Error('step-b failed'); },
        compensate: async () => {},
      },
    ];

    const state = await orchestrator.execute('compensation-fails-saga', steps);
    expect(state.status).toBe('failed');
    expect(state.error).toContain('Compensation failed at');
  });
});
