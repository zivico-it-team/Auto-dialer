import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const createCallbackSchema = z.object({
  leadId: z.string().uuid(),
  campaignId: z.string().uuid(),
  scheduledTime: z.string().datetime(),
  notes: z.string().optional(),
  agentId: z.string().uuid().optional(),
});

export const updateCallbackSchema = z.object({
  scheduledTime: z.string().datetime().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  agentId: z.string().uuid().optional(),
});

export class CallbackController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string || 'PENDING';
      const agentId = req.query.agentId as string;
      const campaignId = req.query.campaignId as string;

      const where: any = {};
      if (status) where.status = status;
      if (campaignId) where.campaignId = campaignId;

      if (req.user?.role === 'AGENT') {
        where.OR = [{ agentId: req.user.userId }, { agentId: null }];
      } else if (agentId) {
        where.agentId = agentId;
      }

      const callbacks = await prisma.callback.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true, email: true } },
          campaign: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledTime: 'asc' },
      });

      res.json({ success: true, data: callbacks });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const scheduledTime = new Date(data.scheduledTime);

      const callback = await prisma.callback.create({
        data: {
          leadId: data.leadId,
          campaignId: data.campaignId,
          agentId: data.agentId || req.user?.userId || null,
          scheduledTime,
          notes: data.notes || null,
          status: 'PENDING',
        },
        include: { lead: true, campaign: true, agent: true },
      });

      await prisma.lead.update({
        where: { id: data.leadId },
        data: {
          status: 'CALLBACK',
          nextAttemptAt: scheduledTime,
        },
      });

      res.status(201).json({ success: true, message: 'Callback scheduled successfully', data: callback });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const data = req.body;

      const updateData: any = {};
      if (data.scheduledTime) updateData.scheduledTime = new Date(data.scheduledTime);
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status) updateData.status = data.status;
      if (data.agentId !== undefined) updateData.agentId = data.agentId;

      const callback = await prisma.callback.update({
        where: { id },
        data: updateData,
        include: { lead: true },
      });

      if (data.status === 'COMPLETED') {
        await prisma.lead.update({
          where: { id: callback.leadId },
          data: { status: 'COMPLETED' },
        });
      }

      res.json({ success: true, message: 'Callback updated', data: callback });
    } catch (err) {
      next(err);
    }
  }
}
