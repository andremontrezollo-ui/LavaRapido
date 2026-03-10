/**
 * PostgreSQL-backed Idempotency Store.
 * Prevents duplicate command/event processing with TTL-based expiry.
 */

import type { Pool } from 'pg';
import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly pool: Pool) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const { rows } = await this.pool.query<{
      key: string; result: string; created_at: Date; expires_at: Date;
    }>(
      `SELECT key, result, created_at, expires_at FROM idempotency_records
       WHERE key=$1 AND expires_at > now()`,
      [key],
    );

    if (rows.length === 0) return null;
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
    const record = await this.get(key);
    return record !== null;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM idempotency_records WHERE expires_at < $1`,
      [now],
    );
    return rowCount ?? 0;
  }
}
