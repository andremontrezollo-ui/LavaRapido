/**
 * PostgreSQL Saga Store — durable replacement for InMemorySagaStore.
 */

import type { Pool } from 'pg';
import type { SagaState, SagaStatus, SagaStore } from '../saga/saga-orchestrator';

export class PostgresSagaStore implements SagaStore {
  constructor(private readonly pool: Pool) {}

  async save(state: SagaState): Promise<void> {
    await this.pool.query(
      `INSERT INTO saga_state
         (saga_id, name, status, current_step, completed_steps,
          failed_step, error, started_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (saga_id) DO UPDATE SET
         status          = EXCLUDED.status,
         current_step    = EXCLUDED.current_step,
         completed_steps = EXCLUDED.completed_steps,
         failed_step     = EXCLUDED.failed_step,
         error           = EXCLUDED.error,
         updated_at      = EXCLUDED.updated_at`,
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
      `SELECT * FROM saga_state WHERE saga_id = $1 LIMIT 1`,
      [sagaId],
    );
    if (rows.length === 0) return null;
    return this.toState(rows[0]);
  }

  async findActive(): Promise<SagaState[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM saga_state
       WHERE status IN ('started', 'step_completed', 'compensating')`,
    );
    return rows.map(this.toState);
  }

  private toState(row: Record<string, unknown>): SagaState {
    const completedSteps: string[] = Array.isArray(row.completed_steps)
      ? row.completed_steps as string[]
      : JSON.parse(row.completed_steps as string);
    return {
      sagaId: row.saga_id as string,
      name: row.name as string,
      status: row.status as SagaStatus,
      currentStep: row.current_step as number,
      completedSteps,
      failedStep: row.failed_step as string | null,
      error: row.error as string | null,
      startedAt: new Date(row.started_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
