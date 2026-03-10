#!/usr/bin/env node
/**
 * Migration runner — applies pending SQL migrations in order.
 * Usage: node scripts/migrate.js [--status] [--rollback]
 *
 * Requires DATABASE_URL environment variable.
 * Migrations are applied in filename alphabetical order.
 * State is tracked in the `schema_migrations` table.
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../src/infra/database/migrations');
const ROLLBACK = process.argv.includes('--rollback');
const STATUS_ONLY = process.argv.includes('--status');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // In CI without a real DB, just print the migration files and exit 0
    console.log('DATABASE_URL not set — listing migrations only (dry-run mode)');
    listMigrations();
    return;
  }

  // Require pg only when actually connecting
  const { Client } = require('pg');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureMigrationsTable(client);

    if (STATUS_ONLY) {
      await printStatus(client);
      return;
    }

    if (ROLLBACK) {
      await rollbackLast(client);
      return;
    }

    await applyPending(client);
  } finally {
    await client.end();
  }
}

function listMigrations() {
  const files = getMigrationFiles('up');
  console.log('Available migrations:');
  files.forEach(f => console.log(`  [${path.basename(f, '.up.sql')}]`));
}

function getMigrationFiles(direction) {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(`.${direction}.sql`))
    .sort()
    .map(f => path.join(MIGRATIONS_DIR, f));
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const res = await client.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(res.rows.map(r => r.version));
}

async function applyPending(client) {
  const applied = await getAppliedMigrations(client);
  const files = getMigrationFiles('up');

  let count = 0;
  for (const file of files) {
    const version = path.basename(file, '.up.sql');
    if (applied.has(version)) {
      console.log(`[${version}] already applied — skipping`);
      continue;
    }

    const sql = fs.readFileSync(file, 'utf8');
    console.log(`[${version}] applying...`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await client.query('COMMIT');
      console.log(`[${version}] applied`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[${version}] FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  if (count === 0) {
    console.log('All migrations already applied.');
  } else {
    console.log(`\n${count} migration(s) applied.`);
  }
}

async function rollbackLast(client) {
  const applied = await getAppliedMigrations(client);
  const versions = [...applied].sort().reverse();

  if (versions.length === 0) {
    console.log('No migrations to roll back.');
    return;
  }

  const last = versions[0];
  const downFile = path.join(MIGRATIONS_DIR, `${last}.down.sql`);

  if (!fs.existsSync(downFile)) {
    console.error(`No down migration for ${last}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(downFile, 'utf8');
  console.log(`[${last}] rolling back...`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE version = $1', [last]);
    await client.query('COMMIT');
    console.log(`[${last}] rolled back`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[${last}] rollback FAILED: ${err.message}`);
    process.exit(1);
  }
}

async function printStatus(client) {
  const applied = await getAppliedMigrations(client);
  const files = getMigrationFiles('up');

  console.log('Migration status:');
  for (const file of files) {
    const version = path.basename(file, '.up.sql');
    const status = applied.has(version) ? 'applied' : 'pending';
    console.log(`  [${version}] ${status}`);
  }
}

run().catch(err => {
  console.error('Migration runner error:', err.message);
  process.exit(1);
});
