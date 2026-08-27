import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

export function requireRoles(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Permission denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}
