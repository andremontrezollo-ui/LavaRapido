/**
 * PostgreSQL Connection Pool — production-grade, fail-fast on missing DATABASE_URL.
 */

import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        'Missing required environment variable: DATABASE_URL. ' +
        'Application cannot start without a valid PostgreSQL connection string.',
      );
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });

    pool.on('error', (err: Error) => {
      console.error(JSON.stringify({ level: 'error', message: 'Unexpected idle client error', error: err.message }));
    });
  }
  return pool;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await getPool().connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    client?.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export default { getPool, checkDatabaseConnection, closePool };