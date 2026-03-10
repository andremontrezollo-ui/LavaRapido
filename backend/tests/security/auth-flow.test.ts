/**
 * Security test: Auth flow validation.
 */

import { describe, it, expect } from 'vitest';
import { validateEnvSchema } from '../../src/shared/config/env.schema';

describe('Auth Flow — Environment Validation', () => {
  const REQUIRED_VARS = {
    DATABASE_URL: 'postgresql://user:pass@localhost/db',
    REDIS_URL: 'redis://localhost:6379',
    RATE_LIMIT_MAX: '100',
    RATE_LIMIT_WINDOW: '15',
  };

  it('should accept valid configuration with JWT_SECRET', () => {
    const result = validateEnvSchema({
      ...REQUIRED_VARS,
      APP_ENV: 'development',
      JWT_SECRET: 'super-secret-key',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _, ...rest } = REQUIRED_VARS;
    const result = validateEnvSchema(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('DATABASE_URL'))).toBe(true);
  });

  it('should fail when REDIS_URL is missing', () => {
    const { REDIS_URL: _, ...rest } = REQUIRED_VARS;
    const result = validateEnvSchema(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('REDIS_URL'))).toBe(true);
  });

  it('should fail when RATE_LIMIT_MAX is missing', () => {
    const { RATE_LIMIT_MAX: _, ...rest } = REQUIRED_VARS;
    const result = validateEnvSchema(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('RATE_LIMIT_MAX'))).toBe(true);
  });

  it('should fail when RATE_LIMIT_WINDOW is missing', () => {
    const { RATE_LIMIT_WINDOW: _, ...rest } = REQUIRED_VARS;
    const result = validateEnvSchema(rest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('RATE_LIMIT_WINDOW'))).toBe(true);
  });

  it('should require JWT_SECRET or JWT_PUBLIC_KEY in production', () => {
    const result = validateEnvSchema({
      ...REQUIRED_VARS,
      APP_ENV: 'production',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('JWT_SECRET') || e.includes('JWT_PUBLIC_KEY'))).toBe(true);
  });

  it('should accept JWT_PUBLIC_KEY instead of JWT_SECRET in production', () => {
    const result = validateEnvSchema({
      ...REQUIRED_VARS,
      APP_ENV: 'production',
      JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----',
    });
    expect(result.valid).toBe(true);
  });

  it('should fail with invalid APP_ENV', () => {
    const result = validateEnvSchema({
      ...REQUIRED_VARS,
      APP_ENV: 'staging',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('APP_ENV'))).toBe(true);
  });

  it('should fail with non-numeric RATE_LIMIT_MAX', () => {
    const result = validateEnvSchema({
      ...REQUIRED_VARS,
      RATE_LIMIT_MAX: 'not-a-number',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('RATE_LIMIT_MAX'))).toBe(true);
  });

  it('should apply defaults for optional variables', () => {
    const result = validateEnvSchema(REQUIRED_VARS);
    expect(result.config.logLevel).toBe('info');
    expect(result.config.maxRetries).toBe(3);
    expect(result.config.lockTtlSeconds).toBe(30);
  });
});
