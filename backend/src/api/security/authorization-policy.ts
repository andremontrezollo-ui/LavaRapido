/**
 * Authorization Policy — validates roles and scopes for protected resources.
 */

export type Role = 'user' | 'admin' | 'service';
export type Scope = 'deposits:write' | 'deposits:read' | 'admin:write' | 'admin:read' | 'service';

export interface AuthorizationContext {
  userId: string;
  roles: string[];
  scopes: string[];
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

export interface ResourcePolicy {
  requiredRoles?: Role[];
  requiredScopes?: Scope[];
  requireAll?: boolean; // true = AND logic, false = OR logic (default)
}

const ENDPOINT_POLICIES: Record<string, ResourcePolicy> = {
  'POST /api/deposits': {
    requiredScopes: ['deposits:write'],
    requiredRoles: ['user', 'admin', 'service'],
    requireAll: false,
  },
  'GET /api/deposits': {
    requiredScopes: ['deposits:read'],
    requiredRoles: ['user', 'admin', 'service'],
    requireAll: false,
  },
  'POST /api/admin/cleanup': {
    requiredRoles: ['admin', 'service'],
    requireAll: false,
  },
  'GET /api/admin/pool-health': {
    requiredRoles: ['admin', 'service'],
    requireAll: false,
  },
};

export class DefaultAuthorizationPolicy {
  authorize(
    ctx: AuthorizationContext,
    method: string,
    path: string,
  ): AuthorizationResult {
    const key = `${method.toUpperCase()} ${path}`;
    const policy = ENDPOINT_POLICIES[key];

    if (!policy) {
      // Unknown endpoint — only admins and services pass by default
      if (ctx.roles.includes('admin') || ctx.roles.includes('service')) {
        return { authorized: true };
      }
      return { authorized: false, reason: `No policy defined for ${key}` };
    }

    const hasRole =
      !policy.requiredRoles ||
      policy.requiredRoles.some(r => ctx.roles.includes(r));

    const hasScope =
      !policy.requiredScopes ||
      policy.requiredScopes.some(s => ctx.scopes.includes(s));

    if (policy.requireAll) {
      if (!hasRole || !hasScope) {
        return { authorized: false, reason: 'Insufficient roles or scopes' };
      }
    } else {
      if (!hasRole && !hasScope) {
        return { authorized: false, reason: 'Insufficient roles or scopes' };
      }
    }

    return { authorized: true };
  }

  /**
   * Check if the user has any of the given roles.
   */
  hasAnyRole(ctx: AuthorizationContext, roles: Role[]): boolean {
    return roles.some(r => ctx.roles.includes(r));
  }

  /**
   * Check if the user has any of the given scopes.
   */
  hasAnyScope(ctx: AuthorizationContext, scopes: Scope[]): boolean {
    return scopes.some(s => ctx.scopes.includes(s));
  }
}
