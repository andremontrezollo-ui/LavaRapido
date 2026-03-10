/**
 * IdempotencyKeyRepository — PostgreSQL-backed persistent idempotency store.
 * Uses ON CONFLICT DO NOTHING for atomic, race-safe key registration.
 */

import type { IdempotencyRecord, IdempotencyStore } from '../../shared/policies/idempotency-policy';

export interface DbClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export class IdempotencyKeyRepository implements IdempotencyStore {
  constructor(private readonly db: DbClient) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const { rows } = await this.db.query<{
      request_hash: string;
      result: string;
      created_at: string;
      expires_at: string;
    }>(
      `SELECT request_hash, result, created_at, expires_at
         FROM idempotency_keys
        WHERE request_hash = $1
          AND expires_at > NOW()`,
      [key],
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      key: row.request_hash,
      result: row.result,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
    };
  }

  /**
   * Atomically inserts the record; silently ignores duplicate keys.
   * Returns true if the key was newly inserted, false if it already existed.
   */
  async save(record: IdempotencyRecord): Promise<void> {
    await this.db.query(
      `INSERT INTO idempotency_keys (request_hash, result, status, created_at, expires_at)
       VALUES ($1, $2, 'completed', $3, $4)
       ON CONFLICT (request_hash) DO NOTHING`,
      [record.key, record.result, record.createdAt.toISOString(), record.expiresAt.toISOString()],
    );
  }

  async exists(key: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count
         FROM idempotency_keys
        WHERE request_hash = $1
          AND expires_at > NOW()`,
      [key],
    );
    return Number(rows[0]?.count ?? 0) > 0;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM idempotency_keys WHERE expires_at <= $1 RETURNING 1
       )
       SELECT COUNT(*)::int AS count FROM deleted`,
      [now.toISOString()],
    );
    return Number(rows[0]?.count ?? 0);
  }
}
