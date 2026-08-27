import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateAndNormalizePhone } from '../utils/phoneValidator.js';
import { parseLeadCsv } from '../utils/csvParser.js';
import { AuditService } from '../services/auditService.js';

export const createLeadSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(5, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum([
    'NEW',
    'QUEUED',
    'CONTACTED',
    'ANSWERED',
    'NO_ANSWER',
    'BUSY',
    'FAILED',
    'CALLBACK',
    'COMPLETED',
    'DO_NOT_CALL',
  ]).optional(),
  optedOut: z.boolean().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

export class LeadController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const search = (req.query.search as string || '').trim();
      const campaignId = req.query.campaignId as string;
      const status = req.query.status as string;
      const optedOut = req.query.optedOut === 'true' ? true : req.query.optedOut === 'false' ? false : undefined;

      const where: any = {};
      if (campaignId) where.campaignId = campaignId;
      if (status) where.status = status;
      if (optedOut !== undefined) where.optedOut = optedOut;

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ];
      }

      const total = await prisma.lead.count({ where });
      const leads = await prisma.lead.findMany({
        where,
        include: {
          campaign: { select: { id: true, name: true } },
          _count: { select: { calls: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: leads,
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

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          campaign: true,
          calls: {
            include: { agent: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
          },
          callbacks: {
            include: { agent: { select: { id: true, name: true } } },
            orderBy: { scheduledTime: 'asc' },
          },
        },
      });

      if (!lead) {
        res.status(404).json({ success: false, error: 'Lead not found' });
        return;
      }

      res.json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const phoneValidation = validateAndNormalizePhone(data.phone);
      if (!phoneValidation.isValid) {
        res.status(400).json({ success: false, error: phoneValidation.error });
        return;
      }

      const existing = await prisma.lead.findFirst({
        where: {
          campaignId: data.campaignId,
          phone: phoneValidation.normalized,
        },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          error: 'A lead with this phone number already exists in this campaign',
        });
        return;
      }

      const lead = await prisma.lead.create({
        data: {
          campaignId: data.campaignId,
          name: data.name,
          phone: phoneValidation.normalized,
          email: data.email || null,
          notes: data.notes || null,
          customFields: data.customFields ? JSON.stringify(data.customFields) : null,
          status: 'NEW',
        },
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'CREATE_LEAD',
        entity: 'LEAD',
        entityId: lead.id,
        details: { name: lead.name, phone: lead.phone, campaignId: lead.campaignId },
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, message: 'Lead created successfully', data: lead });
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
      if (data.phone) {
        const v = validateAndNormalizePhone(data.phone);
        if (!v.isValid) {
          res.status(400).json({ success: false, error: v.error });
          return;
        }
        updateData.phone = v.normalized;
      }
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.status) updateData.status = data.status;
      if (data.optedOut !== undefined) {
        updateData.optedOut = data.optedOut;
        if (data.optedOut) updateData.status = 'DO_NOT_CALL';
      }
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.customFields) updateData.customFields = JSON.stringify(data.customFields);

      const lead = await prisma.lead.update({
        where: { id },
        data: updateData,
      });

      res.json({ success: true, message: 'Lead updated successfully', data: lead });
    } catch (err) {
      next(err);
    }
  }

  static async markDnc(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const lead = await prisma.lead.update({
        where: { id },
        data: {
          status: 'DO_NOT_CALL',
          optedOut: true,
          nextAttemptAt: null,
        },
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'DNC_LEAD',
        entity: 'LEAD',
        entityId: id,
        details: { phone: lead.phone, name: lead.name },
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Lead added to Do Not Call list', data: lead });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      await prisma.lead.delete({ where: { id } });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'DELETE_LEAD',
        entity: 'LEAD',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async importCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = req.body.campaignId;
      const csvData = req.body.csvContent || (req.file ? req.file.buffer.toString('utf-8') : null);

      if (!campaignId) {
        res.status(400).json({ success: false, error: 'Campaign ID is required' });
        return;
      }

      if (!csvData) {
        res.status(400).json({ success: false, error: 'CSV file or csvContent string is required' });
        return;
      }

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      const parsed = parseLeadCsv(csvData);
      if (parsed.validRows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid leads found in CSV',
          details: parsed.invalidRows,
        });
        return;
      }

      const existingPhones = await prisma.lead.findMany({
        where: {
          campaignId,
          phone: { in: parsed.validRows.map((r) => r.phone) },
        },
        select: { phone: true },
      });
      const existingSet = new Set(existingPhones.map((p) => p.phone));

      const leadsToCreate = parsed.validRows.filter((r) => !existingSet.has(r.phone));
      const existingDuplicatesCount = parsed.validRows.length - leadsToCreate.length;

      const created = await prisma.lead.createMany({
        data: leadsToCreate.map((r) => ({
          campaignId,
          name: r.name,
          phone: r.phone,
          email: r.email || null,
          notes: r.notes || null,
          customFields: r.customFields ? JSON.stringify(r.customFields) : null,
          status: 'NEW',
        })),
      });

      await AuditService.log({
        userId: req.user?.userId,
        action: 'IMPORT_LEADS_CSV',
        entity: 'LEAD',
        details: {
          campaignId,
          totalRows: parsed.validRows.length + parsed.invalidRows.length,
          imported: created.count,
          batchDuplicates: parsed.duplicatesCount,
          databaseDuplicates: existingDuplicatesCount,
          invalidCount: parsed.invalidRows.length,
        },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: `Successfully imported ${created.count} leads`,
        data: {
          importedCount: created.count,
          batchDuplicates: parsed.duplicatesCount,
          databaseDuplicates: existingDuplicatesCount,
          invalidRowsCount: parsed.invalidRows.length,
          invalidDetails: parsed.invalidRows.slice(0, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = req.query.campaignId as string;
      const status = req.query.status as string;

      const where: any = {};
      if (campaignId) where.campaignId = campaignId;
      if (status) where.status = status;

      const leads = await prisma.lead.findMany({
        where,
        include: { campaign: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      let csv = 'ID,Name,Phone,Email,Campaign,Status,Attempts,OptedOut,LastAttemptAt,CreatedAt\r\n';
      for (const lead of leads) {
        csv += `"${lead.id}","${lead.name.replace(/"/g, '""')}","${lead.phone}","${lead.email || ''}","${lead.campaign.name.replace(/"/g, '""')}","${lead.status}",${lead.attempts},${lead.optedOut},"${lead.lastAttemptAt?.toISOString() || ''}","${lead.createdAt.toISOString()}"\r\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
