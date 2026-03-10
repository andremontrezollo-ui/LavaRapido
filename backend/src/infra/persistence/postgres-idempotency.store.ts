/**
 * PostgresIdempotencyStore — durable idempotency store.
 */

import { Pool } from 'pg';
import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';
import { getPool } from '../database/connection';

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly pool: Pool = getPool()) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const { rows } = await this.pool.query<{
      key: string; result: string; created_at: Date; expires_at: Date;
    }>(
      `SELECT key, result, created_at, expires_at FROM idempotency_records
       WHERE key=$1 AND expires_at > NOW()`,
      [key],
    );
    if (!rows.length) return null;
    const r = rows[0];
    return { key: r.key, result: r.result, createdAt: r.created_at, expiresAt: r.expires_at };
  }

  async save(record: IdempotencyRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO idempotency_records (key, result, created_at, expires_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (key) DO UPDATE SET result=$2, expires_at=$4`,
      [record.key, record.result, record.createdAt, record.expiresAt],
    );
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM idempotency_records WHERE expires_at < $1`,
      [now],
    );
    return rowCount ?? 0;
  }
}
