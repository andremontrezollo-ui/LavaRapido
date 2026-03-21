/**
 * Authorization Middleware — validates scope-based access.
 */

export type Scope = 'anon' | 'service' | 'admin';

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

const ENDPOINT_SCOPES: Record<string, Scope[]> = {
  'POST /api/v1/mix-sessions': ['anon', 'service'],
  'GET /api/v1/mix-sessions/status': ['anon', 'service'],
  'POST /api/v1/contact': ['anon', 'service'],
  'GET /api/v1/health': ['anon', 'service'],
  'POST /api/v1/admin/cleanup': ['service', 'admin'],
  'GET /api/v1/admin/pool-health': ['service', 'admin'],
  'POST /api/v1/admin/rebalance': ['service', 'admin'],
};

export class AuthorizationMiddleware {
  authorize(scope: string, method: string, path: string): AuthorizationResult {
    const key = `${method.toUpperCase()} ${path}`;
    const allowed = ENDPOINT_SCOPES[key];

    if (!allowed) {
      // Default: allow service scope for unknown endpoints
      if (scope === 'service' || scope === 'admin') {
        return { authorized: true };
      }
      return { authorized: false, reason: `No access policy defined for ${key}` };
    }

    if (!allowed.includes(scope as Scope)) {
      return { authorized: false, reason: `Scope '${scope}' not authorized for ${key}` };
    }

    return { authorized: true };
  }
}
