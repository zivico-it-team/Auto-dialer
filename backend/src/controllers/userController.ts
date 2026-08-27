import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AuditService } from '../services/auditService.js';

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']),
  phone: z.string().optional(),
  sipExtension: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).optional(),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(6).optional(),
  sipExtension: z.string().optional(),
});

export class UserController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          agentProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          agentProfile: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existing) {
        res.status(400).json({ success: false, error: 'Email is already in use' });
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
        userId: req.user?.userId,
        action: 'CREATE_USER',
        entity: 'USER',
        entityId: user.id,
        details: { name: user.name, role: user.role, email: user.email },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          agentProfile: user.agentProfile,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const data = req.body;

      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email.toLowerCase();
      if (data.role) updateData.role = data.role;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.status) updateData.status = data.status;
      if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { agentProfile: true },
      });

      if (data.sipExtension !== undefined) {
        await prisma.agentProfile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            sipExtension: data.sipExtension,
            sipUsername: user.email.split('@')[0],
            status: 'OFFLINE',
          },
          update: {
            sipExtension: data.sipExtension,
          },
        });
      }

      await AuditService.log({
        userId: req.user?.userId,
        action: 'UPDATE_USER',
        entity: 'USER',
        entityId: id,
        details: updateData,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      if (id === req.user?.userId) {
        res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        return;
      }

      await prisma.user.delete({ where: { id } });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'DELETE_USER',
        entity: 'USER',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}
