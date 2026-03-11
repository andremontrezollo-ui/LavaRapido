/**
 * PostgreSQL Idempotency Store — prevents duplicate request processing.
 * Uses PRIMARY KEY on the idempotency key with ON CONFLICT DO NOTHING for atomicity.
 */

import type { Pool } from 'pg';
import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly pool: Pool) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT key, response AS result, created_at, expires_at
       FROM idempotency_records
       WHERE key=$1 AND expires_at > now()`,
      [key],
    );
    if (!rows[0]) return null;
    return {
      key: rows[0].key as string,
      result: typeof rows[0].result === 'string'
        ? rows[0].result
        : JSON.stringify(rows[0].result),
      createdAt: new Date(rows[0].created_at as string),
      expiresAt: new Date(rows[0].expires_at as string),
    };
  }

  async save(record: IdempotencyRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO idempotency_records (key, response, status_code, created_at, expires_at)
       VALUES ($1, $2::jsonb, $3, $4, $5)
       ON CONFLICT (key) DO NOTHING`,
      [record.key, record.result, 200, record.createdAt, record.expiresAt],
    );
  }

  async exists(key: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM idempotency_records WHERE key=$1 AND expires_at > now() LIMIT 1`,
      [key],
    );
    return rows.length > 0;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM idempotency_records WHERE expires_at <= $1`,
      [now],
    );
    return rowCount ?? 0;
  }
}
