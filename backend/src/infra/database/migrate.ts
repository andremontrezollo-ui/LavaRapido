/**
 * Migration runner — applies SQL migration files in order.
 * Maintains a schema_migrations table to track applied migrations.
 */

import fs from 'fs';
import path from 'path';
import { getPool } from './connection';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await getPool().query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename',
  );
  return new Set(rows.map(r => r.filename));
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      console.info(`[migrate] Applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration failed: ${file} — ${err}`);
    } finally {
      client.release();
    }
  }
}
