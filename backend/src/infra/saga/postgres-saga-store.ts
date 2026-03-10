/**
 * PostgresSagaStore — persists saga state in the saga_state PostgreSQL table.
 */

import type { SagaState, SagaStore } from './saga-orchestrator';

export interface DbClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export class PostgresSagaStore implements SagaStore {
  constructor(private readonly db: DbClient) {}

  async save(state: SagaState): Promise<void> {
    await this.db.query(
      `INSERT INTO saga_state
         (saga_id, name, status, current_step, completed_steps, failed_step, error, started_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        state.startedAt.toISOString(),
        state.updatedAt.toISOString(),
      ],
    );
  }

  async findById(sagaId: string): Promise<SagaState | null> {
    const { rows } = await this.db.query<{
      saga_id: string;
      name: string;
      status: string;
      current_step: number;
      completed_steps: string;
      failed_step: string | null;
      error: string | null;
      started_at: string;
      updated_at: string;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps,
              failed_step, error, started_at, updated_at
         FROM saga_state
        WHERE saga_id = $1`,
      [sagaId],
    );

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async findActive(): Promise<SagaState[]> {
    const { rows } = await this.db.query<{
      saga_id: string;
      name: string;
      status: string;
      current_step: number;
      completed_steps: string;
      failed_step: string | null;
      error: string | null;
      started_at: string;
      updated_at: string;
    }>(
      `SELECT saga_id, name, status, current_step, completed_steps,
              failed_step, error, started_at, updated_at
         FROM saga_state
        WHERE status IN ('started', 'step_completed', 'compensating')
        ORDER BY started_at ASC`,
    );

    return rows.map(r => this.mapRow(r));
  }

  private mapRow(row: {
    saga_id: string;
    name: string;
    status: string;
    current_step: number;
    completed_steps: string;
    failed_step: string | null;
    error: string | null;
    started_at: string;
    updated_at: string;
  }): SagaState {
    return {
      sagaId: row.saga_id,
      name: row.name,
      status: row.status as SagaState['status'],
      currentStep: row.current_step,
      completedSteps: JSON.parse(row.completed_steps) as string[],
      failedStep: row.failed_step,
      error: row.error,
      startedAt: new Date(row.started_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
