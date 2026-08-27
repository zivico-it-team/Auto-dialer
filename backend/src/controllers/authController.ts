import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { AuditService } from '../services/auditService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).default('AGENT'),
  phone: z.string().optional(),
  sipExtension: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        res.status(400).json({ success: false, error: 'Email is already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          passwordHash,
          role: data.role,
          status: 'ACTIVE',
          ...(data.role === 'AGENT' && {
            agentProfile: {
              create: {
                sipExtension: data.sipExtension || undefined,
                sipUsername: data.email.split('@')[0],
                status: 'OFFLINE',
              },
            },
          }),
        },
        include: { agentProfile: true },
      });

      await AuditService.log({
        userId: user.id,
        action: 'USER_REGISTERED',
        entity: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            agentProfile: user.agentProfile,
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { agentProfile: true },
      });

      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      if (user.status !== 'ACTIVE') {
        res.status(403).json({ success: false, error: 'Account has been disabled' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      await AuditService.log({
        userId: user.id,
        action: 'LOGIN',
        entity: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            status: user.status,
            agentProfile: user.agentProfile,
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { agentProfile: true },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            agentProfile: user.agentProfile,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, error: 'Current password is incorrect' });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      await AuditService.log({
        userId: user.id,
        action: 'PASSWORD_UPDATED',
        entity: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await AuditService.log({
          userId: req.user.userId,
          action: 'LOGOUT',
          entity: 'USER',
          entityId: req.user.userId,
          ipAddress: req.ip,
        });

        // Set agent to OFFLINE if user was an agent
        if (req.user.role === 'AGENT') {
          await prisma.agentProfile.updateMany({
            where: { userId: req.user.userId },
            data: { status: 'OFFLINE', lastSeenAt: new Date() },
          });
        }
      }

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }
}
