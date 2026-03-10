/**
 * Security tests for JwtVerifier and AuthService
 */

import { describe, it, expect } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { JwtVerifier } from '../../src/api/security/jwt-verifier';
import { AuthService, UnauthorizedError } from '../../src/api/security/auth-service';
import { AuthorizationPolicy, ForbiddenError } from '../../src/api/security/authorization-policy';
import type { AuthenticatedUser } from '../../src/api/security/auth-service';

const SECRET = 'test-secret-min-32-characters-long!!';

function signToken(payload: Record<string, unknown>, secret = SECRET, options: jwt.SignOptions = {}): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: 3600, ...options });
}

describe('JwtVerifier', () => {
  it('verifies a valid token', async () => {
    const verifier = new JwtVerifier({ secret: SECRET, algorithm: 'HS256' });
    const token = signToken({ sub: 'user-1', roles: ['user'], scopes: ['read'] });
    const payload = await verifier.verify(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.roles).toEqual(['user']);
  });

  it('rejects an expired token', async () => {
    const verifier = new JwtVerifier({ secret: SECRET, algorithm: 'HS256' });
    const token = signToken({ sub: 'user-1' }, SECRET, { expiresIn: -1 });
    await expect(verifier.verify(token)).rejects.toThrow('jwt expired');
  });

  it('rejects a token signed with wrong secret', async () => {
    const verifier = new JwtVerifier({ secret: SECRET, algorithm: 'HS256' });
    const token = signToken({ sub: 'user-1' }, 'wrong-secret-min-32-characters-here');
    await expect(verifier.verify(token)).rejects.toThrow('invalid signature');
  });

  it('rejects a malformed token', async () => {
    const verifier = new JwtVerifier({ secret: SECRET, algorithm: 'HS256' });
    await expect(verifier.verify('not.a.valid.token')).rejects.toThrow();
  });

  it('verifies issuer when configured', async () => {
    const verifier = new JwtVerifier({ secret: SECRET, algorithm: 'HS256', issuer: 'lavarapido' });
    const token = signToken({ sub: 'user-1' }, SECRET, { issuer: 'lavarapido' });
    const payload = await verifier.verify(token);
    expect(payload.sub).toBe('user-1');
  });

  it('rejects token with wrong issuer', async () => {
    const verifier = new JwtVerifier({ secret: SECRET, algorithm: 'HS256', issuer: 'lavarapido' });
    const token = signToken({ sub: 'user-1' }, SECRET, { issuer: 'other-issuer' });
    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('throws when no secret or publicKey is configured', async () => {
    const verifier = new JwtVerifier({ algorithm: 'HS256' });
    const token = signToken({ sub: 'user-1' });
    await expect(verifier.verify(token)).rejects.toThrow('requires either secret or publicKey');
  });
});

describe('AuthService', () => {
  it('authenticates a valid token and returns user', async () => {
    const service = new AuthService({ secret: SECRET, algorithm: 'HS256' });
    const token = signToken({ sub: 'user-42', roles: ['admin'], scopes: ['read', 'write'] });
    const user = await service.authenticate(token);
    expect(user.userId).toBe('user-42');
    expect(user.roles).toEqual(['admin']);
    expect(user.scopes).toEqual(['read', 'write']);
  });

  it('throws UnauthorizedError for expired token', async () => {
    const service = new AuthService({ secret: SECRET, algorithm: 'HS256' });
    const token = signToken({ sub: 'user-1' }, SECRET, { expiresIn: -1 });
    await expect(service.authenticate(token)).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for invalid token', async () => {
    const service = new AuthService({ secret: SECRET, algorithm: 'HS256' });
    await expect(service.authenticate('invalid')).rejects.toThrow(UnauthorizedError);
  });
});

describe('AuthorizationPolicy', () => {
  const policy = new AuthorizationPolicy();

  function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
    return {
      userId: 'user-1',
      roles: [],
      scopes: [],
      payload: { sub: 'user-1' },
      ...overrides,
    };
  }

  it('allows user with required scopes', () => {
    const user = makeUser({ scopes: ['read', 'write'] });
    expect(() => policy.authorize(user, ['read'])).not.toThrow();
  });

  it('throws ForbiddenError when scope is missing', () => {
    const user = makeUser({ scopes: ['read'] });
    expect(() => policy.authorize(user, ['write'])).toThrow(ForbiddenError);
  });

  it('admin role bypasses scope check', () => {
    const user = makeUser({ roles: ['admin'], scopes: [] });
    expect(() => policy.authorize(user, ['write', 'admin:full'])).not.toThrow();
  });

  it('allows when no scopes required', () => {
    const user = makeUser({ scopes: [] });
    expect(() => policy.authorize(user, [])).not.toThrow();
  });
});
