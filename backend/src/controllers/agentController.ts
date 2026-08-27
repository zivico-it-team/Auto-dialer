import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { emitCallEvent } from '../socket/socketEmitter.js';
import { AuditService } from '../services/auditService.js';

export const createAgentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  sipExtension: z.string().optional(),
});

export const updateAgentStatusSchema = z.object({
  status: z.enum(['OFFLINE', 'AVAILABLE', 'RINGING', 'ON_CALL', 'PAUSED', 'BREAK']),
});

export const updateAgentSipSchema = z.object({
  sipExtension: z.string().min(2),
  sipUsername: z.string().optional(),
});

export class AgentController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const agents = await prisma.user.findMany({
        where: { role: 'AGENT' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          agentProfile: true,
          assignedCalls: {
            where: {
              status: { in: ['QUEUED', 'DIALING', 'RINGING', 'ANSWERED'] },
            },
            include: { lead: true, campaign: true },
            take: 1,
          },
          _count: {
            select: {
              assignedCalls: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const formattedAgents = await Promise.all(
        agents.map(async (agent) => {
          const callsToday = await prisma.call.count({
            where: {
              agentId: agent.id,
              createdAt: { gte: todayStart },
            },
          });

          const answeredToday = await prisma.call.count({
            where: {
              agentId: agent.id,
              status: 'ENDED',
              durationSeconds: { gt: 0 },
              createdAt: { gte: todayStart },
            },
          });

          return {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            userStatus: agent.status,
            agentProfile: agent.agentProfile,
            activeCall: agent.assignedCalls[0] || null,
            totalCalls: agent._count.assignedCalls,
            callsToday,
            answeredToday,
          };
        })
      );

      res.json({ success: true, data: formattedAgents });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        res.status(400).json({ success: false, error: 'Email is already registered' });
        return;
      }

      if (data.sipExtension) {
        const existingSip = await prisma.agentProfile.findUnique({
          where: { sipExtension: data.sipExtension },
        });
        if (existingSip) {
          res.status(400).json({ success: false, error: 'SIP Extension is already assigned to another agent' });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          passwordHash,
          role: 'AGENT',
          status: 'ACTIVE',
          agentProfile: {
            create: {
              sipExtension: data.sipExtension || undefined,
              sipUsername: data.sipExtension || data.email.split('@')[0],
              status: 'OFFLINE',
            },
          },
        },
        include: { agentProfile: true },
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'CREATE_AGENT',
        entity: 'USER',
        entityId: user.id,
        details: { name: user.name, email: user.email, sipExtension: data.sipExtension },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Agent created successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          agentProfile: user.agentProfile,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);

      const agent = await prisma.user.findUnique({
        where: { id },
        include: { agentProfile: true },
      });

      if (!agent) {
        res.status(404).json({ success: false, error: 'Agent not found' });
        return;
      }

      // Delete agent profile first if needed, then user (Cascade will handle related profile)
      await prisma.user.delete({
        where: { id },
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'DELETE_AGENT',
        entity: 'USER',
        entityId: id,
        details: { name: agent.name, email: agent.email },
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status } = req.body;

      if (req.user?.role === 'AGENT' && req.user.userId !== id) {
        res.status(403).json({ success: false, error: 'Permission denied' });
        return;
      }

      const profile = await prisma.agentProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          status,
          lastSeenAt: new Date(),
        },
        update: {
          status,
          lastSeenAt: new Date(),
        },
      });

      emitCallEvent('agent:status', {
        agentId: id,
        status,
        timestamp: new Date(),
      });

      res.json({ success: true, message: 'Agent status updated', data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async updateSip(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { sipExtension, sipUsername } = req.body;

      const existing = await prisma.agentProfile.findFirst({
        where: {
          sipExtension,
          userId: { not: id },
        },
      });

      if (existing) {
        res.status(400).json({ success: false, error: 'SIP Extension is already assigned to another agent' });
        return;
      }

      const profile = await prisma.agentProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          sipExtension,
          sipUsername: sipUsername || `agent_${sipExtension}`,
          status: 'OFFLINE',
        },
        update: {
          sipExtension,
          sipUsername: sipUsername || undefined,
        },
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'UPDATE_AGENT_SIP',
        entity: 'AGENT_PROFILE',
        entityId: id,
        details: { sipExtension },
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'SIP Extension assigned successfully', data: profile });
    } catch (err) {
      next(err);
    }
  }
}
