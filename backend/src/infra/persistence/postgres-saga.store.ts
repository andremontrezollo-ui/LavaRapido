/**
 * PostgreSQL Saga Store
 * Production implementation backed by the `saga_states` table.
 */

import { Pool } from 'pg';
import type { SagaState, SagaStore } from '../saga/saga-orchestrator';

interface SagaRow {
  saga_id: string;
  name: string;
  status: string;
  current_step: number;
  completed_steps: string[];
  failed_step: string | null;
  error: string | null;
  started_at: Date;
  updated_at: Date;
}

function rowToState(row: SagaRow): SagaState {
  return {
    sagaId: row.saga_id,
    name: row.name,
    status: row.status as SagaState['status'],
    currentStep: row.current_step,
    completedSteps: row.completed_steps,
    failedStep: row.failed_step,
    error: row.error,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresSagaStore implements SagaStore {
  constructor(private readonly pool: Pool) {}

  async save(state: SagaState): Promise<void> {
    await this.pool.query(`
      INSERT INTO saga_states
        (saga_id, name, status, current_step, completed_steps,
         failed_step, error, started_at, updated_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
      ON CONFLICT (saga_id) DO UPDATE SET
        status          = EXCLUDED.status,
        current_step    = EXCLUDED.current_step,
        completed_steps = EXCLUDED.completed_steps,
        failed_step     = EXCLUDED.failed_step,
        error           = EXCLUDED.error,
        updated_at      = EXCLUDED.updated_at
    `, [
      state.sagaId,
      state.name,
      state.status,
      state.currentStep,
      JSON.stringify(state.completedSteps),
      state.failedStep,
      state.error,
      state.startedAt,
      state.updatedAt,
    ]);
  }

  async findById(sagaId: string): Promise<SagaState | null> {
    const { rows } = await this.pool.query<SagaRow>(
      'SELECT * FROM saga_states WHERE saga_id = $1',
      [sagaId],
    );
    return rows[0] ? rowToState(rows[0]) : null;
  }

  async findActive(): Promise<SagaState[]> {
    const { rows } = await this.pool.query<SagaRow>(
      `SELECT * FROM saga_states
       WHERE status IN ('started', 'step_completed', 'compensating')
       ORDER BY started_at ASC`,
    );
    return rows.map(rowToState);
  }
}
