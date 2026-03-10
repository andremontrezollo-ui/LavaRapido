/**
 * PostgreSQL connection pool — production-grade with retry and configurable timeouts.
 * Requires DATABASE_URL environment variable.
 */

import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export interface PoolConfig {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statement_timeout?: number;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 30_000,
};

export function createPool(config?: PoolConfig): Pool {
  const connectionString = config?.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required. ' +
      'Set it in your .env file (copy from .env.example) or in your environment.',
    );
  }

  pool = new Pool({
    connectionString,
    max: config?.max ?? DEFAULT_POOL_CONFIG.max,
    idleTimeoutMillis: config?.idleTimeoutMillis ?? DEFAULT_POOL_CONFIG.idleTimeoutMillis,
    connectionTimeoutMillis: config?.connectionTimeoutMillis ?? DEFAULT_POOL_CONFIG.connectionTimeoutMillis,
    statement_timeout: config?.statement_timeout ?? DEFAULT_POOL_CONFIG.statement_timeout,
  });

  pool.on('error', (err) => {
    console.error('[pg-pool] Unexpected client error', err.message);
  });

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Acquire a client from the pool, retrying on transient errors.
 */
export async function acquireClientWithRetry(
  maxAttempts = 3,
  delayMs = 500,
): Promise<PoolClient> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getPool().connect();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }

  throw lastError ?? new Error('Failed to acquire database connection');
}

/**
 * Test database connectivity, throwing on failure.
 */
export async function checkDatabaseConnectivity(): Promise<void> {
  const client = await acquireClientWithRetry();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}