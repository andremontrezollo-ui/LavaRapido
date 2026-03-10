import { PoolClient } from 'pg';
import { getPool } from './connection';

export class TransactionManager {
  private client: PoolClient | null = null;

  async begin(): Promise<PoolClient> {
    this.client = await getPool().connect();
    await this.client.query('BEGIN');
    return this.client;
  }

  async commit(): Promise<void> {
    if (!this.client) throw new Error('No active transaction');
    await this.client.query('COMMIT');
    this.client.release();
    this.client = null;
  }

  async rollback(): Promise<void> {
    if (!this.client) return;
    await this.client.query('ROLLBACK');
    this.client.release();
    this.client = null;
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
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
