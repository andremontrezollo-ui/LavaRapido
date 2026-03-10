/**
 * PostgresSagaStore — durable saga state persistence.
 */

import { Pool } from 'pg';
import type { SagaState, SagaStore } from '../saga/saga-orchestrator';
import { getPool } from '../database/connection';

export class PostgresSagaStore implements SagaStore {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(state: SagaState): Promise<void> {
    await this.pool.query(
      `INSERT INTO saga_states
         (saga_id, name, status, current_step, completed_steps, failed_step, error, started_at, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
       ON CONFLICT (saga_id) DO UPDATE
         SET status=$3, current_step=$4, completed_steps=$5::jsonb,
             failed_step=$6, error=$7, updated_at=$9`,
      [
        state.sagaId,
        state.name,
        state.status,
        state.currentStep,
        JSON.stringify(state.completedSteps),
        state.failedStep,
        state.error,
        state.startedAt,
        state.updatedAt,
      ],
    );
  }

  async findById(sagaId: string): Promise<SagaState | null> {
    const { rows } = await this.pool.query<{
      saga_id: string; name: string; status: SagaState['status'];
      current_step: number; completed_steps: string[]; failed_step: string | null;
      error: string | null; started_at: Date; updated_at: Date;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps,
              failed_step, error, started_at, updated_at
       FROM saga_states WHERE saga_id=$1`,
      [sagaId],
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      sagaId: r.saga_id,
      name: r.name,
      status: r.status,
      currentStep: r.current_step,
      completedSteps: r.completed_steps,
      failedStep: r.failed_step,
      error: r.error,
      startedAt: r.started_at,
      updatedAt: r.updated_at,
    };
  }

  async findActive(): Promise<SagaState[]> {
    const { rows } = await this.pool.query<{
      saga_id: string; name: string; status: SagaState['status'];
      current_step: number; completed_steps: string[]; failed_step: string | null;
      error: string | null; started_at: Date; updated_at: Date;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps,
              failed_step, error, started_at, updated_at
       FROM saga_states
       WHERE status IN ('started','step_completed','compensating')`,
    );
    return rows.map(r => ({
      sagaId: r.saga_id,
      name: r.name,
      status: r.status,
      currentStep: r.current_step,
      completedSteps: r.completed_steps,
      failedStep: r.failed_step,
      error: r.error,
      startedAt: r.started_at,
      updatedAt: r.updated_at,
    }));
  }
}
