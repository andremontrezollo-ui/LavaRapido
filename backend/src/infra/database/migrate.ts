import * as fs from 'fs';
import * as path from 'path';
import { getPool } from './connection';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(): Promise<Set<string>> {
  const result = await getPool().query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id ASC',
  );
  return new Set(result.rows.map(r => r.filename));
}

async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (executed.has(filename)) {
      console.log(`[migrate] Skipping ${filename} (already executed)`);
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`[migrate] Running ${filename}...`);
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename],
      );
      await client.query('COMMIT');
      console.log(`[migrate] ${filename} executed successfully`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('[migrate] All migrations complete');
}

runMigrations().catch(err => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});
