import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

function createPool(): Pool {
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return new Pool({
    host: process.env.PG_HOST ?? 'localhost',
    port: parseInt(process.env.PG_PORT ?? '5432', 10),
    user: process.env.PG_USER ?? 'lava',
    password: process.env.PG_PASSWORD ?? 'lava_secret',
    database: process.env.PG_DATABASE ?? 'lavarapido',
    max: parseInt(process.env.PG_MAX_CONNECTIONS ?? '10', 10),
  });
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

export async function query<T extends import('pg').QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<import('pg').QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}