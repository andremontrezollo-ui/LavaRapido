/**
 * Integration tests for IdempotencyGuard with mock store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IdempotencyGuard } from '../../src/shared/policies/idempotency-policy';
import type { IdempotencyRecord, IdempotencyStore } from '../../src/shared/policies/idempotency-policy';

function makeMockIdempotencyStore(): IdempotencyStore & { records: Map<string, IdempotencyRecord> } {
  const records = new Map<string, IdempotencyRecord>();
  return {
    records,
    async get(key) {
      const record = records.get(key);
      if (!record) return null;
      if (record.expiresAt < new Date()) {
        records.delete(key);
        return null;
      }
      return record;
    },
    async save(record) { records.set(record.key, record); },
    async exists(key) {
      const record = records.get(key);
      if (!record) return false;
      if (record.expiresAt < new Date()) {
        records.delete(key);
        return false;
      }
      return true;
    },
    async deleteExpired(now) {
      let count = 0;
      for (const [key, record] of records) {
        if (record.expiresAt < now) { records.delete(key); count++; }
      }
      return count;
    },
  };
}

describe('IdempotencyGuard', () => {
  let store: ReturnType<typeof makeMockIdempotencyStore>;
  let guard: IdempotencyGuard;

  beforeEach(() => {
    store = makeMockIdempotencyStore();
    guard = new IdempotencyGuard(store, 3600);
  });

  it('executes operation on first call', async () => {
    let callCount = 0;
    const result = await guard.executeOnce('key-1', async () => {
      callCount++;
      return 'result-1';
    });
    expect(result).toBe('result-1');
    expect(callCount).toBe(1);
  });

  it('returns cached result on second call with same key', async () => {
    let callCount = 0;
    const op = async () => { callCount++; return 'cached-result'; };
    await guard.executeOnce('key-2', op);
    const result = await guard.executeOnce('key-2', op);
    expect(result).toBe('cached-result');
    expect(callCount).toBe(1);
  });

  it('isProcessed returns true after first execution', async () => {
    await guard.executeOnce('key-3', async () => 42);
    expect(await guard.isProcessed('key-3')).toBe(true);
  });

  it('isProcessed returns false for unknown key', async () => {
    expect(await guard.isProcessed('unknown-key')).toBe(false);
  });

  it('expired keys are ignored and operation re-executes', async () => {
    const now = new Date();
    const expiredRecord: IdempotencyRecord = {
      key: 'expired-key',
      result: JSON.stringify('old-result'),
      createdAt: new Date(now.getTime() - 7200_000),
      expiresAt: new Date(now.getTime() - 3600_000),
    };
    store.records.set('expired-key', expiredRecord);

    let callCount = 0;
    const result = await guard.executeOnce('expired-key', async () => {
      callCount++;
      return 'new-result';
    });
    expect(result).toBe('new-result');
    expect(callCount).toBe(1);
  });
});
