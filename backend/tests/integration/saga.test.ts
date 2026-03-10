/**
 * Integration tests for SagaOrchestrator with mock store
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SagaOrchestrator } from '../../src/infra/saga/saga-orchestrator';
import type { SagaState, SagaStore, SagaStep } from '../../src/infra/saga/saga-orchestrator';

function makeMockSagaStore(): SagaStore & { sagas: Map<string, SagaState> } {
  const sagas = new Map<string, SagaState>();
  return {
    sagas,
    async save(state) { sagas.set(state.sagaId, { ...state, completedSteps: [...state.completedSteps] }); },
    async findById(sagaId) { return sagas.get(sagaId) ?? null; },
    async findActive() {
      return Array.from(sagas.values()).filter(
        s => s.status === 'started' || s.status === 'step_completed' || s.status === 'compensating',
      );
    },
  };
}

describe('SagaOrchestrator', () => {
  let store: ReturnType<typeof makeMockSagaStore>;
  let orchestrator: SagaOrchestrator;
  let idGen: { generate: () => string };

  beforeEach(() => {
    store = makeMockSagaStore();
    idGen = { generate: () => 'saga-id-1' };
    orchestrator = new SagaOrchestrator(store, idGen);
  });

  it('completes successfully when all steps pass', async () => {
    const steps: SagaStep[] = [
      { name: 'step1', execute: vi.fn(), compensate: vi.fn() },
      { name: 'step2', execute: vi.fn(), compensate: vi.fn() },
    ];

    const result = await orchestrator.execute('test-saga', steps);

    expect(result.status).toBe('completed');
    expect(result.completedSteps).toEqual(['step1', 'step2']);
    expect(steps[0].execute).toHaveBeenCalledOnce();
    expect(steps[1].execute).toHaveBeenCalledOnce();
  });

  it('compensates in reverse order on failure', async () => {
    const callOrder: string[] = [];
    const steps: SagaStep[] = [
      {
        name: 'step1',
        execute: vi.fn().mockImplementation(() => { callOrder.push('exec:step1'); }),
        compensate: vi.fn().mockImplementation(() => { callOrder.push('comp:step1'); }),
      },
      {
        name: 'step2',
        execute: vi.fn().mockImplementation(() => { callOrder.push('exec:step2'); }),
        compensate: vi.fn().mockImplementation(() => { callOrder.push('comp:step2'); }),
      },
      {
        name: 'step3',
        execute: vi.fn().mockRejectedValue(new Error('step3 failed')),
        compensate: vi.fn().mockImplementation(() => { callOrder.push('comp:step3'); }),
      },
    ];

    const result = await orchestrator.execute('failing-saga', steps);

    expect(result.status).toBe('compensated');
    expect(result.failedStep).toBe('step3');
    expect(callOrder).toEqual(['exec:step1', 'exec:step2', 'comp:step2', 'comp:step1']);
  });

  it('marks saga as failed when compensation fails', async () => {
    const steps: SagaStep[] = [
      {
        name: 'step1',
        execute: vi.fn(),
        compensate: vi.fn().mockRejectedValue(new Error('compensation error')),
      },
      {
        name: 'step2',
        execute: vi.fn().mockRejectedValue(new Error('step2 failed')),
        compensate: vi.fn(),
      },
    ];

    const result = await orchestrator.execute('comp-fail-saga', steps);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('compensation error');
  });

  it('persists saga state to store', async () => {
    const steps: SagaStep[] = [
      { name: 'step1', execute: vi.fn(), compensate: vi.fn() },
    ];

    await orchestrator.execute('persisted-saga', steps);
    const saved = await store.findById('saga-id-1');
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe('completed');
  });

  it('finds active sagas', async () => {
    store.sagas.set('active', {
      sagaId: 'active',
      name: 'a',
      status: 'started',
      currentStep: 0,
      completedSteps: [],
      failedStep: null,
      error: null,
      startedAt: new Date(),
      updatedAt: new Date(),
    });
    store.sagas.set('done', {
      sagaId: 'done',
      name: 'b',
      status: 'completed',
      currentStep: 1,
      completedSteps: ['s1'],
      failedStep: null,
      error: null,
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const active = await store.findActive();
    expect(active).toHaveLength(1);
    expect(active[0].sagaId).toBe('active');
  });
});
