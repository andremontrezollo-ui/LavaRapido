/**
 * PostgreSQL connection pool.
 * Reads DATABASE_URL from environment and provides a shared Pool instance.
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      process.stderr.write(JSON.stringify({
        level: 'error',
        message: 'Unexpected PostgreSQL pool error',
        error: err.message,
        timestamp: new Date().toISOString(),
      }) + '\n');
    });
  }
  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}