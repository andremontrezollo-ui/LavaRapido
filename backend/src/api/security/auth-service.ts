import { JwtVerifier } from './jwt-verifier';
import type { JwtVerifierOptions, JwtPayload } from './jwt-verifier';

export type { JwtVerifierOptions, JwtPayload };

export interface AuthenticatedUser {
  userId: string;
  roles: string[];
  scopes: string[];
  payload: JwtPayload;
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class AuthService {
  private readonly verifier: JwtVerifier;

  constructor(options: JwtVerifierOptions) {
    this.verifier = new JwtVerifier(options);
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.verifier.verify(token);
      return {
        userId: payload.sub,
        roles: payload.roles ?? [],
        scopes: payload.scopes ?? [],
        payload,
      };
    } catch (err) {
      throw new UnauthorizedError(
        err instanceof Error ? err.message : 'Authentication failed',
      );
    }
  }
}
