import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { dialerEngine } from '../workers/dialerEngine.js';
import { AuditService } from '../services/auditService.js';

export const createCampaignSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  maxConcurrentCalls: z.number().int().min(1).max(50).default(5),
  retryLimit: z.number().int().min(1).max(10).default(3),
  retryDelaySeconds: z.number().int().min(60).default(3600),
  callingStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm').default('09:00'),
  callingEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm').default('18:00'),
  timezone: z.string().default('UTC'),
  recordCalls: z.boolean().default(true),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(['DRAFT', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'STOPPED']).optional(),
});

export class CampaignController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaigns = await prisma.campaign.findMany({
        include: {
          _count: {
            select: {
              leads: true,
              calls: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const enrichedCampaigns = await Promise.all(
        campaigns.map(async (c) => {
          const completedLeads = await prisma.lead.count({
            where: {
              campaignId: c.id,
              status: { in: ['ANSWERED', 'COMPLETED', 'DO_NOT_CALL'] },
            },
          });

          const activeCalls = await prisma.call.count({
            where: {
              campaignId: c.id,
              status: { in: ['QUEUED', 'DIALING', 'RINGING', 'ANSWERED'] },
            },
          });

          const answeredCalls = await prisma.call.count({
            where: {
              campaignId: c.id,
              status: 'ENDED',
              durationSeconds: { gt: 0 },
            },
          });

          const totalLeads = c._count.leads;
          const progressPercent = totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

          return {
            ...c,
            totalLeads,
            completedLeads,
            activeCalls,
            answeredCalls,
            progressPercent,
          };
        })
      );

      res.json({ success: true, data: enrichedCampaigns });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              leads: true,
              calls: true,
            },
          },
        },
      });

      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      // Detailed lead status counts
      const statusCounts = await prisma.lead.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: true,
      });

      const leadBreakdown = statusCounts.reduce((acc: Record<string, number>, curr) => {
        const count = typeof curr._count === 'number' ? curr._count : 0;
        acc[curr.status] = count;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          ...campaign,
          leadBreakdown,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const campaign = await prisma.campaign.create({
        data: {
          name: data.name,
          description: data.description,
          maxConcurrentCalls: data.maxConcurrentCalls,
          retryLimit: data.retryLimit,
          retryDelaySeconds: data.retryDelaySeconds,
          callingStartTime: data.callingStartTime,
          callingEndTime: data.callingEndTime,
          timezone: data.timezone,
          recordCalls: data.recordCalls,
          status: 'READY',
        },
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'CREATE_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: campaign.id,
        details: { name: campaign.name },
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, message: 'Campaign created successfully', data: campaign });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const data = req.body;

      const campaign = await prisma.campaign.update({
        where: { id },
        data,
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'UPDATE_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: id,
        details: data,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Campaign updated successfully', data: campaign });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      await prisma.campaign.delete({ where: { id } });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'DELETE_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async start(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const campaign = await dialerEngine.startCampaign(id);

      await AuditService.log({
        userId: req.user?.userId,
        action: 'START_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Campaign started', data: campaign });
    } catch (err) {
      next(err);
    }
  }

  static async pause(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const campaign = await dialerEngine.pauseCampaign(id);

      await AuditService.log({
        userId: req.user?.userId,
        action: 'PAUSE_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Campaign paused', data: campaign });
    } catch (err) {
      next(err);
    }
  }

  static async resume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const campaign = await dialerEngine.startCampaign(id);

      await AuditService.log({
        userId: req.user?.userId,
        action: 'RESUME_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Campaign resumed', data: campaign });
    } catch (err) {
      next(err);
    }
  }

  static async stop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const campaign = await dialerEngine.stopCampaign(id);

      await AuditService.log({
        userId: req.user?.userId,
        action: 'STOP_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Campaign stopped', data: campaign });
    } catch (err) {
      next(err);
    }
  }

  static async emergencyStop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dialerEngine.emergencyStop(req.user?.userId);

      await AuditService.log({
        userId: req.user?.userId,
        action: 'EMERGENCY_STOP',
        entity: 'SYSTEM',
        details: 'Emergency stop triggered. All campaigns halted.',
        ipAddress: req.ip,
      });

      res.json({ success: true, message: result.message });
    } catch (err) {
      next(err);
    }
  }
}
