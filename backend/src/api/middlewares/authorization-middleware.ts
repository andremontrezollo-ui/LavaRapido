import type { Request, Response, NextFunction } from 'express';
import { AuthorizationPolicy, ForbiddenError } from '../security/authorization-policy';

const policy = new AuthorizationPolicy();

export function requireScopes(...scopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    try {
      policy.authorize(req.user, scopes);
      next();
    } catch (err) {
      if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
      } else {
        next(err);
      }
    }
  };
}
