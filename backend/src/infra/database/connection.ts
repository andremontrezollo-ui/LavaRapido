/**
 * PostgreSQL database connection pool.
 * Replaces the placeholder TypeORM/MySQL connection.
 */

import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function createPool(config: DatabaseConfig): Pool {
  pool = new Pool({
    connectionString: config.connectionString,
    max: config.max ?? 10,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5_000,
  });

  pool.on('error', (err) => {
    console.error('[pg-pool] Unexpected client error', err);
  });

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialised. Call createPool() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    const client: PoolClient = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export { Pool, PoolClient };