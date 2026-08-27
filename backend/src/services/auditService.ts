import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any> | string;
  ipAddress?: string;
}

export class AuditService {
  static async log(params: AuditLogParams) {
    try {
      const detailsStr =
        typeof params.details === 'object'
          ? JSON.stringify(params.details)
          : params.details;

      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          details: detailsStr,
          ipAddress: params.ipAddress,
        },
      });

      logger.info(`📝 [Audit] ${params.action} on ${params.entity}${params.entityId ? `:${params.entityId}` : ''}`);
    } catch (err) {
      logger.error('Failed to create audit log', err);
    }
  }
}
