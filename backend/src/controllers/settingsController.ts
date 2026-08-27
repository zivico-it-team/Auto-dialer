import { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { config } from '../config/environment.js';
import { telephonyService } from '../telephony/telephonyService.js';
import { AuditService } from '../services/auditService.js';

export class SettingsController {
  static async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customSettings = await prisma.systemSetting.findMany();
      const dncCount = await prisma.lead.count({ where: { optedOut: true } });

      const settingsMap = customSettings.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          telephony: {
            provider: config.telephonyProvider,
            providerName: telephonyService.name,
            isConnected: telephonyService.isConnected(),
            asteriskHost: config.asterisk.host,
            asteriskPort: config.asterisk.port,
            asteriskContext: config.asterisk.context,
            sipDomain: config.sip.domain,
            sipPort: config.sip.port,
          },
          recording: {
            storagePath: config.recordingStoragePath,
            enabledDefault: config.recordingEnabledDefault,
          },
          concurrency: {
            globalMaxConcurrentCalls: config.globalMaxConcurrentCalls,
          },
          compliance: {
            dncLeadsTotal: dncCount,
            defaultCallingStartTime: config.defaultCallingStartTime,
            defaultCallingEndTime: config.defaultCallingEndTime,
            defaultTimezone: config.defaultTimezone,
          },
          customSettings: settingsMap,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSetting(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key, value, description } = req.body;
      if (!key) {
        res.status(400).json({ success: false, error: 'Setting key is required' });
        return;
      }

      const setting = await prisma.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          description: description || null,
        },
        update: {
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          description: description || undefined,
        },
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'UPDATE_SYSTEM_SETTING',
        entity: 'SYSTEM_SETTING',
        entityId: key,
        details: { key, value },
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Setting saved successfully', data: setting });
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const action = req.query.action as string;

      const where: any = {};
      if (action) where.action = action;

      const total = await prisma.auditLog.count({ where });
      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
