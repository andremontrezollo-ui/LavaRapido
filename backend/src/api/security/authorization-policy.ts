/**
 * Authorization Policy — scope and role-based access control.
 *
 * Separates authorization from authentication:
 *   - Authentication: "who are you?" → handled by AuthService
 *   - Authorization: "are you allowed?" → handled here
 *
 * Policy is declarative and centralized. All endpoint access rules
 * are defined in ENDPOINT_POLICIES and evaluated at request time.
 */

export type Scope = 'anon' | 'service' | 'admin';
export type Role = string;

export interface AccessPolicy {
  /** Minimum scopes allowed. Any match grants access. */
  allowedScopes: Scope[];
  /** If set, at least one of these roles must be present. */
  requiredRoles?: Role[];
}

export interface AuthorizationInput {
  scope: string;
  roles?: string[];
  method: string;
  path: string;
}

export type AuthorizationResult =
  | { authorized: true }
  | { authorized: false; reason: string; code: 'FORBIDDEN' | 'INSUFFICIENT_SCOPE' | 'MISSING_ROLE' };

/** Endpoint access policies. Paths support exact match only. */
const ENDPOINT_POLICIES: Record<string, AccessPolicy> = {
  'GET /health':                       { allowedScopes: ['anon', 'service', 'admin'] },
  'GET /readiness':                    { allowedScopes: ['anon', 'service', 'admin'] },
  'POST /api/v1/mix-sessions':         { allowedScopes: ['anon', 'service'] },
  'GET /api/v1/mix-sessions/status':   { allowedScopes: ['anon', 'service'] },
  'POST /api/v1/contact':              { allowedScopes: ['anon', 'service'] },
  'POST /api/v1/admin/cleanup':        { allowedScopes: ['service', 'admin'] },
  'GET /api/v1/admin/pool-health':     { allowedScopes: ['service', 'admin'] },
  'POST /api/v1/admin/rebalance':      { allowedScopes: ['admin'], requiredRoles: ['admin'] },
};

export class AuthorizationPolicy {
  /**
   * Evaluate whether the given identity is authorized to access the endpoint.
   *
   * Rules:
   *   1. If no policy exists for the endpoint, only 'service' and 'admin' may access it.
   *   2. Scope must be in the allowed list.
   *   3. If requiredRoles is set, at least one role must match.
   */
  authorize(input: AuthorizationInput): AuthorizationResult {
    const key = `${input.method.toUpperCase()} ${input.path}`;
    const policy = ENDPOINT_POLICIES[key];

    if (!policy) {
      // Default deny for unknown endpoints unless service/admin
      if (input.scope === 'service' || input.scope === 'admin') {
        return { authorized: true };
      }
      return {
        authorized: false,
        reason: `No access policy defined for ${key}. Only service accounts may access undefined endpoints.`,
        code: 'FORBIDDEN',
      };
    }

    // Check scope
    if (!policy.allowedScopes.includes(input.scope as Scope)) {
      return {
        authorized: false,
        reason: `Scope '${input.scope}' is not permitted for ${key}. Allowed: ${policy.allowedScopes.join(', ')}`,
        code: 'INSUFFICIENT_SCOPE',
      };
    }

    // Check roles if required
    if (policy.requiredRoles && policy.requiredRoles.length > 0) {
      const userRoles = input.roles ?? [];
      const hasRequiredRole = policy.requiredRoles.some(r => userRoles.includes(r));
      if (!hasRequiredRole) {
        return {
          authorized: false,
          reason: `Missing required role. Required one of: ${policy.requiredRoles.join(', ')}`,
          code: 'MISSING_ROLE',
        };
      }
    }

    return { authorized: true };
  }
}
