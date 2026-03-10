/**
 * PostgreSQL Idempotency Store
 * Production implementation backed by the `idempotency_records` table.
 */

import { Pool } from 'pg';
import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';

interface IdempotencyRow {
  key: string;
  result: string;
  created_at: Date;
  expires_at: Date;
}

function rowToRecord(row: IdempotencyRow): IdempotencyRecord {
  return {
    key: row.key,
    result: row.result,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly pool: Pool) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const { rows } = await this.pool.query<IdempotencyRow>(
      'SELECT * FROM idempotency_records WHERE key = $1 AND expires_at > NOW()',
      [key],
    );
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async save(record: IdempotencyRecord): Promise<void> {
    await this.pool.query(`
      INSERT INTO idempotency_records (key, result, created_at, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key) DO UPDATE SET
        result     = EXCLUDED.result,
        expires_at = EXCLUDED.expires_at
    `, [record.key, record.result, record.createdAt, record.expiresAt]);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM idempotency_records WHERE expires_at < $1',
      [now],
    );
    return rowCount ?? 0;
  }
}
