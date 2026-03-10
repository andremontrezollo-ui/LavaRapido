/**
 * PostgreSQL connection pool — production-grade with retry, timeout, and DATABASE_URL support.
 */

import { Pool, PoolConfig } from 'pg';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

function buildPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;

  const base: PoolConfig = {
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
    max: Number(process.env.DB_POOL_MAX ?? 10),
    min: Number(process.env.DB_POOL_MIN ?? 2),
  };

  if (databaseUrl) {
    return { ...base, connectionString: databaseUrl };
  }

  return {
    ...base,
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool(buildPoolConfig());
    _pool.on('error', (err) => {
      console.error(JSON.stringify({ level: 'error', message: 'Unexpected pg pool error', error: err.message }));
    });
  }
  return _pool;
}

export async function connectWithRetry(retries = MAX_RETRIES): Promise<Pool> {
  const pool = getPool();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      return pool;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(JSON.stringify({ level: 'error', message: `DB connection attempt ${attempt}/${retries} failed`, error: msg }));
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export default getPool;