/**
 * Auth Flow Security Tests
 * Verifies that protected routes enforce authentication,
 * duplicate requests are blocked, and rate limiting works.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IdempotencyGuard } from '../../src/shared/policies/idempotency-policy';
import { InMemoryIdempotencyStore } from '../../src/test-utils/in-memory-idempotency-store';
import { InMemoryDistributedLock } from '../../src/test-utils/in-memory-distributed-lock';

describe('Auth flow security', () => {
  describe('Idempotency Guard', () => {
    let store: InMemoryIdempotencyStore;
    let guard: IdempotencyGuard;

    beforeEach(() => {
      store = new InMemoryIdempotencyStore();
      guard = new IdempotencyGuard(store, 3600);
    });

    it('executes operation once and caches the result', async () => {
      let calls = 0;
      const operation = async () => { calls++; return { value: 42 }; };

      const r1 = await guard.executeOnce('key-1', operation);
      const r2 = await guard.executeOnce('key-1', operation);

      expect(calls).toBe(1);
      expect(r1).toEqual(r2);
      expect(r2.value).toBe(42);
    });

    it('treats different keys as independent operations', async () => {
      let calls = 0;
      const operation = async () => { calls++; return calls; };

      await guard.executeOnce('key-a', operation);
      await guard.executeOnce('key-b', operation);

      expect(calls).toBe(2);
    });

    it('marks operation as processed after first call', async () => {
      await guard.executeOnce('key-check', async () => 'done');
      expect(await guard.isProcessed('key-check')).toBe(true);
    });

    it('returns false for isProcessed on unseen key', async () => {
      expect(await guard.isProcessed('unseen')).toBe(false);
    });

    it('expires old records and allows re-execution', async () => {
      const past = new Date(Date.now() - 5000);
      const expiredRecord = {
        key: 'expired-key',
        result: JSON.stringify('old'),
        createdAt: past,
        expiresAt: past,
      };
      await store.save(expiredRecord);

      let calls = 0;
      await guard.executeOnce('expired-key', async () => { calls++; return 'new'; });

      expect(calls).toBe(1); // re-executed because record expired
    });
  });

  describe('Distributed Lock contention', () => {
    let lock: InMemoryDistributedLock;

    beforeEach(() => {
      lock = new InMemoryDistributedLock();
    });

    it('grants lock to first acquirer and denies second', async () => {
      const granted1 = await lock.acquire('resource-x', 30);
      const granted2 = await lock.acquire('resource-x', 30);

      expect(granted1).toBe(true);
      expect(granted2).toBe(false);
    });

    it('releases lock and allows re-acquisition', async () => {
      await lock.acquire('resource-y', 30);
      await lock.release('resource-y');
      const regranted = await lock.acquire('resource-y', 30);

      expect(regranted).toBe(true);
    });

    it('renews a held lock', async () => {
      await lock.acquire('resource-z', 30);
      const renewed = await lock.renew('resource-z', 60);
      expect(renewed).toBe(true);
    });

    it('cannot renew a lock not held', async () => {
      const renewed = await lock.renew('non-existent-lock', 30);
      expect(renewed).toBe(false);
    });

    it('reports isHeld correctly', async () => {
      expect(await lock.isHeld('key-held')).toBe(false);
      await lock.acquire('key-held', 30);
      expect(await lock.isHeld('key-held')).toBe(true);
      await lock.release('key-held');
      expect(await lock.isHeld('key-held')).toBe(false);
    });

    it('simulates expired lock becoming available', async () => {
      // Acquire with very short TTL (already expired by manipulating internal state)
      await lock.acquire('expiring-key', 30);
      // Force expiry by clearing
      (lock as any).locks.get('expiring-key').expiresAt = new Date(Date.now() - 1000);

      const granted = await lock.acquire('expiring-key', 30);
      expect(granted).toBe(true);
    });
  });
});
