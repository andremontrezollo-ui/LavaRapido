import type { AuthenticatedUser } from './auth-service';

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class AuthorizationPolicy {
  authorize(user: AuthenticatedUser, requiredScopes: string[]): void {
    if (user.roles.includes('admin')) return;

    for (const scope of requiredScopes) {
      if (!user.scopes.includes(scope)) {
        throw new ForbiddenError(`Missing required scope: ${scope}`);
      }
    }
  }
}
