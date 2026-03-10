/**
 * Auth Service — resolves authentication from an incoming request.
 *
 * Supports two authentication modes:
 *   1. Service-role key (HMAC-shared-secret Bearer token) — internal services
 *   2. JWT Bearer token — end-user clients
 *
 * The service explicitly distinguishes:
 *   - AuthenticationFailure: identity cannot be established
 *   - AuthorizationFailure: identity established but lacks permission (handled by authorization layer)
 */

import type { Logger } from '../../shared/logging';
import { JwtVerifier } from './jwt-verifier';
import type { JwtClaims } from './jwt-verifier';

export interface AuthIdentity {
  sub: string;
  scope: string;
  roles: string[];
  jti?: string;
}

export type AuthServiceResult =
  | { authenticated: true; identity: AuthIdentity }
  | { authenticated: false; reason: string; code: 'MISSING_CREDENTIALS' | 'EXPIRED' | 'INVALID' | 'REVOKED' };

export interface AuthServiceOptions {
  serviceRoleKey: string;
  jwtVerifier?: JwtVerifier;
}

export class AuthService {
  constructor(
    private readonly options: AuthServiceOptions,
    private readonly logger: Logger,
  ) {}

  async authenticate(authHeader: string | null | undefined): Promise<AuthServiceResult> {
    if (!authHeader || authHeader.trim() === '') {
      return { authenticated: false, reason: 'Missing Authorization header', code: 'MISSING_CREDENTIALS' };
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return { authenticated: false, reason: 'Invalid Authorization format — expected "Bearer <token>"', code: 'INVALID' };
    }

    const token = parts[1];

    // Try service-role key first (constant-time comparison)
    if (this.constantTimeEqual(token, this.options.serviceRoleKey)) {
      return {
        authenticated: true,
        identity: { sub: 'service-account', scope: 'service', roles: ['service'] },
      };
    }

    // Try JWT verification
    if (this.options.jwtVerifier) {
      const result = await this.options.jwtVerifier.verify(token);
      if (result.ok) {
        const claims: JwtClaims = result.claims;
        return {
          authenticated: true,
          identity: {
            sub: claims.sub,
            scope: claims.scope ?? 'anon',
            roles: claims.roles ?? [],
            jti: claims.jti,
          },
        };
      }

      // Map JWT error codes to auth result codes
      type FailCode = Extract<AuthServiceResult, { authenticated: false }>['code'];
      const codeMap: Record<string, FailCode> = {
        EXPIRED: 'EXPIRED',
        REVOKED: 'REVOKED',
        INVALID_SIGNATURE: 'INVALID',
        INVALID_ISSUER: 'INVALID',
        INVALID_AUDIENCE: 'INVALID',
        MALFORMED: 'INVALID',
      };

      const code: FailCode = codeMap[result.code] ?? 'INVALID';
      this.logger.warn('JWT authentication failed', { reason: result.reason, code });
      return { authenticated: false, reason: result.reason, code };
    }

    // No JWT verifier configured: service-role key is the only allowed credential
    this.logger.warn('Authentication failed — invalid service-role key');
    return { authenticated: false, reason: 'Invalid credentials', code: 'INVALID' };
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
