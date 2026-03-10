/**
 * Authentication Middleware — validates JWT Bearer tokens.
 */

import type { JwtVerifier, JwtPayload } from '../security/jwt-verifier';
import type { Logger } from '../../shared/logging';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  roles?: string[];
  scopes?: string[];
  scope?: string;
  reason?: string;
}

export class AuthMiddleware {
  constructor(
    private readonly jwtVerifier: JwtVerifier,
    private readonly logger: Logger,
    /** @deprecated kept for backward compatibility */
    private readonly serviceRoleKey?: string,
  ) {}

  validate(authHeader: string | null): AuthResult {
    if (!authHeader) {
      return { authenticated: false, reason: 'Missing Authorization header' };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return { authenticated: false, reason: 'Invalid Authorization format' };
    }

    const token = parts[1];

    const result = this.jwtVerifier.verify(token);
    if (!result.valid || !result.payload) {
      this.logger.warn('JWT authentication failed', { reason: result.reason });
      return { authenticated: false, reason: result.reason ?? 'Invalid token' };
    }

    const payload: JwtPayload = result.payload;
    return {
      authenticated: true,
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
      scopes: payload.scopes ?? [],
      scope: (payload.roles ?? [])[0] ?? 'user',
    };
  }

  /** @deprecated Use validate() instead */
  validateServiceRole(authHeader: string | null): AuthResult {
    return this.validate(authHeader);
  }

  /** @deprecated Use validate() instead */
  validateAnonKey(authHeader: string | null, _anonKey: string): AuthResult {
    return this.validate(authHeader);
  }
}
