/**
 * Transaction Manager — wraps operations in a PostgreSQL transaction.
 * Rolls back automatically on error.
 */

import type { Pool, PoolClient } from 'pg';

export class TransactionManager {
  constructor(private readonly pool: Pool) {}

  async run<T>(
    operation: (client: PoolClient) => Promise<T>,
    timeoutMs: number = 30_000,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (timeoutMs > 0) {
        const safeTimeout = Math.floor(Math.abs(timeoutMs));
        await client.query('SET LOCAL statement_timeout TO $1', [safeTimeout]);
      }

      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
