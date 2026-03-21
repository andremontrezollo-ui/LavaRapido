/**
 * Authentication Middleware — validates request authentication.
 * Uses HMAC-based token or service-role key validation.
 */

import type { Logger } from '../../shared/logging';

export interface AuthResult {
  authenticated: boolean;
  scope?: string;
  reason?: string;
}

export class AuthMiddleware {
  constructor(
    private readonly serviceRoleKey: string,
    private readonly logger: Logger,
  ) {}

  validateServiceRole(authHeader: string | null): AuthResult {
    if (!authHeader) {
      return { authenticated: false, reason: 'Missing Authorization header' };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return { authenticated: false, reason: 'Invalid Authorization format' };
    }

    const token = parts[1];

    // Constant-time comparison to prevent timing attacks
    if (!this.constantTimeEqual(token, this.serviceRoleKey)) {
      this.logger.warn('Authentication failed', { reason: 'invalid_token' });
      return { authenticated: false, reason: 'Invalid credentials' };
    }

    return { authenticated: true, scope: 'service' };
  }

  validateAnonKey(authHeader: string | null, anonKey: string): AuthResult {
    if (!authHeader) {
      return { authenticated: false, reason: 'Missing Authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');
    if (!this.constantTimeEqual(token, anonKey)) {
      return { authenticated: false, reason: 'Invalid anon key' };
    }

    return { authenticated: true, scope: 'anon' };
  }

  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}
