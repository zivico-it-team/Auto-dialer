import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { prisma } from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { id: string };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token is missing or malformed' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // Verify that user still exists and is ACTIVE
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, name: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    res.status(403).json({ success: false, error: 'Account is inactive or does not exist' });
    return;
  }

  req.user = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  next();
}

export function requireRoles(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Permission denied for this resource' });
      return;
    }
    next();
  };
}

export const requireRole = requireRoles;
