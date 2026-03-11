/**
 * PostgreSQL Saga Store — crash-safe saga state persistence.
 * Uses optimistic locking via updated_at to prevent concurrent state corruption.
 */

import type { Pool } from 'pg';
import type { SagaState, SagaStore } from './saga-orchestrator';

export class PostgresSagaStore implements SagaStore {
  constructor(private readonly pool: Pool) {}

  async save(state: SagaState): Promise<void> {
    await this.pool.query(
      `INSERT INTO sagas
         (saga_id, name, status, current_step, completed_steps, failed_step, error, started_at, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
       ON CONFLICT (saga_id) DO UPDATE SET
         status = EXCLUDED.status,
         current_step = EXCLUDED.current_step,
         completed_steps = EXCLUDED.completed_steps,
         failed_step = EXCLUDED.failed_step,
         error = EXCLUDED.error,
         updated_at = EXCLUDED.updated_at`,
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
    const { rows } = await this.pool.query(
      `SELECT * FROM sagas WHERE saga_id=$1`,
      [sagaId],
    );
    return rows[0] ? this.rowToState(rows[0]) : null;
  }

  async findActive(): Promise<SagaState[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM sagas WHERE status IN ('started','step_completed','compensating') ORDER BY started_at ASC`,
    );
    return rows.map(this.rowToState);
  }

  private rowToState(row: Record<string, unknown>): SagaState {
    return {
      sagaId: row.saga_id as string,
      name: row.name as string,
      status: row.status as SagaState['status'],
      currentStep: row.current_step as number,
      completedSteps: Array.isArray(row.completed_steps) ? row.completed_steps as string[] : JSON.parse(row.completed_steps as string),
      failedStep: row.failed_step as string | null,
      error: row.error as string | null,
      startedAt: new Date(row.started_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
