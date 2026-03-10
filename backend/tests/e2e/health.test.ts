/**
 * E2E tests for health and readiness endpoints
 */

import { describe, it, expect } from 'vitest';
import { HealthCheck } from '../../src/infra/observability/health';
import { ReadinessCheck } from '../../src/infra/observability/readiness';

describe('HealthCheck', () => {
  it('returns healthy when no dependencies configured', async () => {
    const check = new HealthCheck();
    const report = await check.checkAll();
    expect(report.status).toBe('healthy');
    expect(report.checks).toHaveLength(2);
    expect(report.timestamp).toBeTruthy();
    expect(report.uptime).toBeGreaterThanOrEqual(0);
  });

  it('returns unhealthy when postgres check fails', async () => {
    const fakePool = {
      query: async () => { throw new Error('Connection refused'); },
    } as any;
    const check = new HealthCheck(fakePool);
    const report = await check.checkAll();
    expect(report.status).toBe('unhealthy');
    const pgCheck = report.checks.find(c => c.name === 'postgres');
    expect(pgCheck?.status).toBe('unhealthy');
  });

  it('returns unhealthy when redis check fails', async () => {
    const fakeRedis = {
      ping: async () => { throw new Error('ECONNREFUSED'); },
    } as any;
    const check = new HealthCheck(undefined, fakeRedis);
    const report = await check.checkAll();
    expect(report.status).toBe('unhealthy');
    const redisCheck = report.checks.find(c => c.name === 'redis');
    expect(redisCheck?.status).toBe('unhealthy');
  });

  it('returns healthy when both dependencies are available', async () => {
    const fakePool = { query: async () => ({ rows: [{ '?column?': 1 }] }) } as any;
    const fakeRedis = { ping: async () => 'PONG' } as any;
    const check = new HealthCheck(fakePool, fakeRedis);
    const report = await check.checkAll();
    expect(report.status).toBe('healthy');
    expect(report.checks.every(c => c.status === 'healthy')).toBe(true);
  });

  it('includes latencyMs in successful checks', async () => {
    const fakePool = { query: async () => ({ rows: [] }) } as any;
    const check = new HealthCheck(fakePool);
    const report = await check.checkAll();
    const pgCheck = report.checks.find(c => c.name === 'postgres');
    expect(pgCheck?.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe('ReadinessCheck', () => {
  it('returns ready=true when no dependencies configured', async () => {
    const check = new ReadinessCheck();
    const report = await check.checkAll();
    expect(report.ready).toBe(true);
    expect(report.checks).toHaveLength(0);
    expect(report.timestamp).toBeTruthy();
  });

  it('returns ready=false when database is down', async () => {
    const fakePool = {
      query: async () => { throw new Error('DB error'); },
    } as any;
    const check = new ReadinessCheck(fakePool);
    const report = await check.checkAll();
    expect(report.ready).toBe(false);
    const dbCheck = report.checks.find(c => c.name === 'database');
    expect(dbCheck?.ready).toBe(false);
  });

  it('returns ready=false when redis is down', async () => {
    const fakeRedis = {
      ping: async () => { throw new Error('Redis error'); },
    } as any;
    const check = new ReadinessCheck(undefined, fakeRedis);
    const report = await check.checkAll();
    expect(report.ready).toBe(false);
  });

  it('returns ready=true when all dependencies are up', async () => {
    const fakePool = { query: async () => ({ rows: [] }) } as any;
    const fakeRedis = { ping: async () => 'PONG' } as any;
    const check = new ReadinessCheck(fakePool, fakeRedis);
    const report = await check.checkAll();
    expect(report.ready).toBe(true);
  });
});
