import { Response, NextFunction } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { telephonyService } from '../telephony/telephonyService.js';
import { config } from '../config/environment.js';
import { emitCallEvent } from '../socket/socketEmitter.js';

export const updateDispositionSchema = z.object({
  disposition: z.enum([
    'Interested',
    'Not Interested',
    'Callback',
    'No Answer',
    'Busy',
    'Wrong Number',
    'Do Not Call',
    'Completed',
    'Other',
  ]),
  notes: z.string().optional(),
});

export const manualDialSchema = z.object({
  leadId: z.string().uuid(),
  callbackId: z.string().uuid().optional(),
});

export class CallController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const campaignId = req.query.campaignId as string;
      const agentId = req.query.agentId as string;
      const status = req.query.status as string;
      const disposition = req.query.disposition as string;
      const search = (req.query.search as string || '').trim();

      const where: any = {};
      if (campaignId) where.campaignId = campaignId;
      if (status) where.status = status;
      if (disposition) where.disposition = disposition;

      if (req.user?.role === 'AGENT') {
        where.agentId = req.user.userId;
      } else if (agentId) {
        where.agentId = agentId;
      }

      if (search) {
        where.OR = [
          { callId: { contains: search } },
          { lead: { name: { contains: search } } },
          { lead: { phone: { contains: search } } },
        ];
      }

      const total = await prisma.call.count({ where });
      const calls = await prisma.call.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true, email: true } },
          campaign: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: calls,
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
      const call = await prisma.call.findFirst({
        where: {
          OR: [{ id }, { callId: id }],
          ...(req.user?.role === 'AGENT' && { agentId: req.user.userId }),
        },
        include: {
          lead: true,
          campaign: true,
          agent: { select: { id: true, name: true, email: true } },
        },
      });

      if (!call) {
        res.status(404).json({ success: false, error: 'Call record not found' });
        return;
      }

      res.json({ success: true, data: call });
    } catch (err) {
      next(err);
    }
  }

  static async manualDial(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId, callbackId } = req.body;
      const agentId = req.user!.userId;

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { campaign: true },
      });

      if (!lead) {
        res.status(404).json({ success: false, error: 'Lead not found' });
        return;
      }

      const agentProfile = await prisma.agentProfile.findUnique({
        where: { userId: agentId },
      });

      const callSessionId = `MANUAL-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Create Call Record in DB
      const call = await prisma.call.create({
        data: {
          callId: callSessionId,
          campaignId: lead.campaignId,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          agentId,
          direction: 'OUTBOUND',
          status: 'DIALING',
          startedAt: new Date(),
        },
        include: { lead: true, campaign: true, agent: true },
      });

      // Update Agent Profile to RINGING / ON_CALL
      await prisma.agentProfile.updateMany({
        where: { userId: agentId },
        data: { status: 'RINGING', lastSeenAt: new Date() },
      });

      // If this was a callback, complete it
      if (callbackId) {
        await prisma.callback.update({
          where: { id: callbackId },
          data: { status: 'COMPLETED' },
        });
      }

      emitCallEvent('call:dialing', {
        callId: call.callId,
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        campaignId: lead.campaignId,
        campaignName: lead.campaign.name,
        agentId,
        agentName: req.user?.name,
        status: 'DIALING',
        timestamp: new Date(),
      });

      // Originate call via telephony provider
      await telephonyService.dial({
        callId: callSessionId,
        phoneNumber: lead.phone,
        agentExtension: agentProfile?.sipExtension || undefined,
        campaignId: lead.campaignId,
        leadId: lead.id,
        record: lead.campaign.recordCalls,
      });

      res.status(201).json({
        success: true,
        message: `1-Click Call originated to ${lead.name} (${lead.phone})`,
        data: call,
      });
    } catch (err) {
      next(err);
    }
  }

  static async hangup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const call = await prisma.call.findFirst({
        where: { OR: [{ id }, { callId: id }] },
      });

      if (!call) {
        res.status(404).json({ success: false, error: 'Call not found' });
        return;
      }

      await telephonyService.hangup(call.callId);
      res.json({ success: true, message: 'Hangup signal sent' });
    } catch (err) {
      next(err);
    }
  }

  static async updateDisposition(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { disposition, notes } = req.body;

      const call = await prisma.call.findFirst({
        where: { OR: [{ id }, { callId: id }] },
        include: { lead: true },
      });

      if (!call) {
        res.status(404).json({ success: false, error: 'Call not found' });
        return;
      }

      const updated = await prisma.call.update({
        where: { id: call.id },
        data: {
          disposition,
          notes: notes || undefined,
        },
      });

      if (disposition === 'Do Not Call' && call.leadId) {
        await prisma.lead.update({
          where: { id: call.leadId },
          data: {
            status: 'DO_NOT_CALL',
            optedOut: true,
            nextAttemptAt: null,
          },
        });
      }

      res.json({ success: true, message: 'Disposition updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async getRecording(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const call = await prisma.call.findFirst({
        where: {
          OR: [{ id }, { callId: id }],
          ...(req.user?.role === 'AGENT' && { agentId: req.user.userId }),
        },
      });

      if (!call) {
        res.status(404).json({ success: false, error: 'Recording not found or access denied' });
        return;
      }

      const filePath = path.join(config.recordingStoragePath, `${call.callId}.wav`);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': stat.size,
          'Content-Disposition': `inline; filename="${call.callId}.wav"`,
        });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }

      // Synthetic Mock WAV generator
      const sampleRate = 8000;
      const durationSeconds = Math.min(Math.max(call.durationSeconds || 3, 2), 10);
      const numSamples = sampleRate * durationSeconds;
      const buffer = Buffer.alloc(44 + numSamples * 2);

      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(36 + numSamples * 2, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20);
      buffer.writeUInt16LE(1, 22);
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate * 2, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(numSamples * 2, 40);

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 + Math.sin(2 * Math.PI * 880 * t) * 0.1;
        const intSample = Math.floor(sample * 32767);
        buffer.writeInt16LE(intSample, 44 + i * 2);
      }

      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length,
        'Content-Disposition': `inline; filename="${call.callId}.wav"`,
      });
      res.end(buffer);
    } catch (err) {
      next(err);
    }
  }
}
