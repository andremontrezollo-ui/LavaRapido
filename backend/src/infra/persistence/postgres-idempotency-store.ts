/**
 * PostgreSQL Idempotency Store — durable replacement for InMemoryIdempotencyStore.
 */

import type { Pool } from 'pg';
import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly pool: Pool) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM idempotency_keys WHERE key = $1 AND expires_at > NOW() LIMIT 1`,
      [key],
    );
    if (rows.length === 0) return null;
    return this.toRecord(rows[0]);
  }

  async save(record: IdempotencyRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO idempotency_keys (key, result, created_at, expires_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (key) DO UPDATE SET
         result     = EXCLUDED.result,
         expires_at = EXCLUDED.expires_at`,
      [record.key, record.result, record.createdAt, record.expiresAt],
    );
  }

  async exists(key: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM idempotency_keys WHERE key = $1 AND expires_at > NOW() LIMIT 1`,
      [key],
    );
    return rows.length > 0;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM idempotency_keys WHERE expires_at <= $1`,
      [now],
    );
    return rowCount ?? 0;
  }

  private toRecord(row: Record<string, unknown>): IdempotencyRecord {
    return {
      key: row.key as string,
      result: row.result as string,
      createdAt: new Date(row.created_at as string),
      expiresAt: new Date(row.expires_at as string),
    };
  }
}
