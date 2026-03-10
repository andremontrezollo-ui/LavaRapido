/**
 * PostgreSQL-backed Saga Store.
 * Persists saga state for recovery after process restart.
 */

import type { Pool } from 'pg';
import type { SagaState, SagaStore } from './saga-orchestrator';

export class PostgresSagaStore implements SagaStore {
  constructor(private readonly pool: Pool) {}

  async save(state: SagaState): Promise<void> {
    await this.pool.query(
      `INSERT INTO saga_states
         (saga_id, name, status, current_step, completed_steps, failed_step, error, started_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (saga_id) DO UPDATE SET
         status=$3,
         current_step=$4,
         completed_steps=$5,
         failed_step=$6,
         error=$7,
         updated_at=$9`,
      [
        state.sagaId,
        state.name,
        state.status,
        state.currentStep,
        JSON.stringify(state.completedSteps),
        state.failedStep ?? null,
        state.error ?? null,
        state.startedAt,
        state.updatedAt,
      ],
    );
  }

  async findById(sagaId: string): Promise<SagaState | null> {
    const { rows } = await this.pool.query<{
      saga_id: string; name: string; status: any; current_step: number;
      completed_steps: string; failed_step: string | null; error: string | null;
      started_at: Date; updated_at: Date;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps,
              failed_step, error, started_at, updated_at
       FROM saga_states WHERE saga_id=$1`,
      [sagaId],
    );

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findActive(): Promise<SagaState[]> {
    const { rows } = await this.pool.query<{
      saga_id: string; name: string; status: any; current_step: number;
      completed_steps: string; failed_step: string | null; error: string | null;
      started_at: Date; updated_at: Date;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps,
              failed_step, error, started_at, updated_at
       FROM saga_states
       WHERE status IN ('started','step_completed','compensating')
       ORDER BY updated_at`,
    );

    return rows.map(r => this.mapRow(r));
  }

  private mapRow(r: {
    saga_id: string; name: string; status: any; current_step: number;
    completed_steps: any; failed_step: string | null; error: string | null;
    started_at: Date; updated_at: Date;
  }): SagaState {
    return {
      sagaId: r.saga_id,
      name: r.name,
      status: r.status,
      currentStep: r.current_step,
      completedSteps: typeof r.completed_steps === 'string'
        ? JSON.parse(r.completed_steps)
        : r.completed_steps,
      failedStep: r.failed_step,
      error: r.error,
      startedAt: r.started_at,
      updatedAt: r.updated_at,
    };
  }
}
