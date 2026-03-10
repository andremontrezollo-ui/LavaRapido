/**
 * Integration test — Saga recovery and compensation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SagaOrchestrator } from '../../src/infra/saga/saga-orchestrator';
import { InMemorySagaStore } from '../../src/test-utils/InMemorySagaStore';
import type { SagaStep } from '../../src/infra/saga/saga-orchestrator';

let idCounter = 0;
const fakeIdGen = { generate: () => `saga-${++idCounter}` };

describe('Saga — recovery and compensation', () => {
  let store: InMemorySagaStore;
  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    store = new InMemorySagaStore();
    orchestrator = new SagaOrchestrator(store, fakeIdGen);
  });

  it('completes all steps when none fail', async () => {
    const log: string[] = [];
    const steps: SagaStep[] = [
      { name: 'step-1', execute: async () => { log.push('exec-1'); }, compensate: async () => { log.push('comp-1'); } },
      { name: 'step-2', execute: async () => { log.push('exec-2'); }, compensate: async () => { log.push('comp-2'); } },
    ];

    const state = await orchestrator.execute('test-saga', steps);

    expect(state.status).toBe('completed');
    expect(log).toEqual(['exec-1', 'exec-2']);
    expect(state.completedSteps).toEqual(['step-1', 'step-2']);
  });

  it('compensates completed steps when a step fails', async () => {
    const log: string[] = [];
    const steps: SagaStep[] = [
      { name: 's1', execute: async () => { log.push('exec-1'); }, compensate: async () => { log.push('comp-1'); } },
      { name: 's2', execute: async () => { log.push('exec-2'); }, compensate: async () => { log.push('comp-2'); } },
      { name: 's3', execute: async () => { throw new Error('step-3 failed'); }, compensate: async () => { log.push('comp-3'); } },
    ];

    const state = await orchestrator.execute('fail-saga', steps);

    expect(state.status).toBe('compensated');
    expect(state.failedStep).toBe('s3');
    expect(log).toContain('exec-1');
    expect(log).toContain('exec-2');
    expect(log).toContain('comp-2');
    expect(log).toContain('comp-1');
    expect(log).not.toContain('comp-3'); // s3 never executed
  });

  it('persists saga state so it can be recovered', async () => {
    const steps: SagaStep[] = [
      { name: 'persist-step', execute: async () => {}, compensate: async () => {} },
    ];

    const state = await orchestrator.execute('persist-saga', steps);

    const recovered = await store.findById(state.sagaId);
    expect(recovered).not.toBeNull();
    expect(recovered!.status).toBe('completed');
  });

  it('findActive returns only in-progress sagas', async () => {
    // Create a completed saga
    const stepsOk: SagaStep[] = [
      { name: 's', execute: async () => {}, compensate: async () => {} },
    ];
    await orchestrator.execute('done-saga', stepsOk);

    // Manually save an "active" saga
    await store.save({
      sagaId: 'active-1',
      name: 'active-saga',
      status: 'started',
      currentStep: 0,
      completedSteps: [],
      failedStep: null,
      error: null,
      startedAt: new Date(),
      updatedAt: new Date(),
    });

    const active = await store.findActive();
    expect(active.length).toBe(1);
    expect(active[0].sagaId).toBe('active-1');
  });
});
