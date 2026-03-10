/**
 * Security tests for RateLimitMiddleware with mock store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimitMiddleware } from '../../src/api/middlewares/rate-limit.middleware';
import type { RateLimitStore } from '../../src/api/middlewares/rate-limit.middleware';

function makeMockRateLimitStore(): RateLimitStore & { calls: Map<string, number> } {
  const calls = new Map<string, number>();
  const expiresAt = new Map<string, number>();

  return {
    calls,
    async increment(key, windowSeconds) {
      const now = Date.now();
      const exp = expiresAt.get(key);

      if (!exp || exp < now) {
        calls.set(key, 1);
        expiresAt.set(key, now + windowSeconds * 1000);
        return { count: 1, ttl: windowSeconds };
      }

      const count = (calls.get(key) ?? 0) + 1;
      calls.set(key, count);
      return { count, ttl: Math.ceil((expiresAt.get(key)! - now) / 1000) };
    },
  };
}

describe('RateLimitMiddleware', () => {
  let store: ReturnType<typeof makeMockRateLimitStore>;
  let middleware: RateLimitMiddleware;
  const MAX_REQUESTS = 5;
  const WINDOW = 60;

  beforeEach(() => {
    store = makeMockRateLimitStore();
    middleware = new RateLimitMiddleware(store, MAX_REQUESTS, WINDOW);
  });

  it('allows request when under limit', async () => {
    const result = await middleware.check('ip-hash-1', '/api/test');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_REQUESTS - 1);
  });

  it('blocks request after reaching max', async () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      await middleware.check('ip-hash-2', '/api/test');
    }
    const result = await middleware.check('ip-hash-2', '/api/test');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('different IPs have independent counters', async () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      await middleware.check('ip-blocked', '/api/test');
    }
    const blocked = await middleware.check('ip-blocked', '/api/test');
    const allowed = await middleware.check('ip-different', '/api/test');

    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it('different endpoints have independent counters', async () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      await middleware.check('ip-hash-3', '/api/endpoint-a');
    }
    const blockedA = await middleware.check('ip-hash-3', '/api/endpoint-a');
    const allowedB = await middleware.check('ip-hash-3', '/api/endpoint-b');

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it('tracks remaining count correctly', async () => {
    const results = [];
    for (let i = 0; i < MAX_REQUESTS; i++) {
      results.push(await middleware.check('ip-counter', '/api/count'));
    }
    expect(results[0].remaining).toBe(MAX_REQUESTS - 1);
    expect(results[MAX_REQUESTS - 1].remaining).toBe(0);
  });
});
