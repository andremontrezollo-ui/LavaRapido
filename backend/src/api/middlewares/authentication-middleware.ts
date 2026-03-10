import type { Request, Response, NextFunction } from 'express';
import type { AuthService, AuthenticatedUser } from '../security/auth-service';
import { UnauthorizedError } from '../security/auth-service';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function createAuthenticationMiddleware(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }
    const token = authHeader.slice(7);
    try {
      req.user = await authService.authenticate(token);
      next();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        res.status(401).json({ error: err.message });
      } else {
        next(err);
      }
    }
  };
}
