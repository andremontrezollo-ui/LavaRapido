/**
 * Transaction Manager — guarantees atomicity across multiple operations.
 */

import { Pool, PoolClient } from 'pg';
import { getPool } from './connection';

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

export class TransactionManager {
  constructor(private readonly pool: Pool = getPool()) {}

  async run<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async runSerializable<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await callback(client);
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
