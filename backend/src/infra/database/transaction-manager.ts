/**
 * Transaction Manager — provides atomic database operations via withTransaction().
 */

import type { PoolClient } from 'pg';
import { acquireClientWithRetry } from './connection';

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Execute an operation inside a database transaction.
 * Automatically commits on success and rolls back on error.
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
): Promise<T> {
  const client = await acquireClientWithRetry();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Execute an operation inside a serializable transaction (strongest isolation).
 * Use for saga state updates and critical financial operations.
 */
export async function withSerializableTransaction<T>(
  callback: TransactionCallback<T>,
): Promise<T> {
  const client = await acquireClientWithRetry();
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
