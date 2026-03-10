import { Pool } from 'pg';
import type { SagaState, SagaStatus, SagaStore } from '../saga/saga-orchestrator';

export class PostgresSagaStore implements SagaStore {
  constructor(private readonly pool: Pool) {}

  async save(state: SagaState): Promise<void> {
    await this.pool.query(
      `INSERT INTO saga_state
         (saga_id, name, status, current_step, completed_steps, failed_step, error, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (saga_id) DO UPDATE SET
         status=EXCLUDED.status,
         current_step=EXCLUDED.current_step,
         completed_steps=EXCLUDED.completed_steps,
         failed_step=EXCLUDED.failed_step,
         error=EXCLUDED.error,
         updated_at=EXCLUDED.updated_at`,
      [
        state.sagaId,
        state.name,
        state.status,
        state.currentStep,
        state.completedSteps,
        state.failedStep,
        state.error,
        state.updatedAt,
      ],
    );
  }

  async findById(sagaId: string): Promise<SagaState | null> {
    const result = await this.pool.query<{
      saga_id: string;
      name: string;
      status: SagaStatus;
      current_step: number;
      completed_steps: string[];
      failed_step: string | null;
      error: string | null;
      started_at: Date;
      updated_at: Date;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps, failed_step, error, started_at, updated_at
       FROM saga_state WHERE saga_id=$1`,
      [sagaId],
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findActive(): Promise<SagaState[]> {
    const result = await this.pool.query<{
      saga_id: string;
      name: string;
      status: SagaStatus;
      current_step: number;
      completed_steps: string[];
      failed_step: string | null;
      error: string | null;
      started_at: Date;
      updated_at: Date;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps, failed_step, error, started_at, updated_at
       FROM saga_state
       WHERE status NOT IN ('completed', 'compensated', 'failed')`,
    );
    return result.rows.map(row => this.mapRow(row));
  }

  private mapRow(row: {
    saga_id: string;
    name: string;
    status: SagaStatus;
    current_step: number;
    completed_steps: string[];
    failed_step: string | null;
    error: string | null;
    started_at: Date;
    updated_at: Date;
  }): SagaState {
    return {
      sagaId: row.saga_id,
      name: row.name,
      status: row.status,
      currentStep: row.current_step,
      completedSteps: Array.isArray(row.completed_steps) ? row.completed_steps : [],
      failedStep: row.failed_step,
      error: row.error,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
    };
  }
}
