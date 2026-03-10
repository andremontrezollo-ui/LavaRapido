import { Pool } from 'pg';
import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly pool: Pool) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const result = await this.pool.query<{
      key: string;
      result: string;
      created_at: Date;
      expires_at: Date;
    }>(
      `SELECT key, result, created_at, expires_at FROM idempotency_keys WHERE key=$1 AND expires_at > NOW()`,
      [key],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      key: row.key,
      result: row.result,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  async save(record: IdempotencyRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO idempotency_keys (key, result, created_at, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET result=EXCLUDED.result, expires_at=EXCLUDED.expires_at`,
      [record.key, record.result, record.createdAt, record.expiresAt],
    );
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM idempotency_keys WHERE key=$1 AND expires_at > NOW()`,
      [key],
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM idempotency_keys WHERE expires_at <= $1`,
      [now],
    );
    return result.rowCount ?? 0;
  }
}
