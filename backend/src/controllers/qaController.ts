import { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AITranscriptionService } from '../services/aiTranscriptionService.js';

export class QAController {
  static async listCalls(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const agentId = req.query.agentId as string;
      const redFlagOnly = req.query.redFlag === 'true';
      const search = (req.query.search as string || '').trim();

      const where: any = {
        durationSeconds: { gt: 0 },
      };

      if (agentId) where.agentId = agentId;
      if (search) {
        where.OR = [
          { callId: { contains: search } },
          { leadName: { contains: search } },
          { leadPhone: { contains: search } },
          { lead: { name: { contains: search } } },
          { lead: { phone: { contains: search } } },
        ];
      }

      if (redFlagOnly) {
        where.qaEvaluation = { redFlagAlert: true };
      }

      const total = await prisma.call.count({ where });
      const calls = await prisma.call.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
          qaEvaluation: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      // Auto-evaluate any call that doesn't have QA evaluation yet
      for (const c of calls) {
        if (!c.qaEvaluation && c.durationSeconds > 0) {
          try {
            await AITranscriptionService.evaluateCall(c.id);
          } catch (e) {
            // Ignore background evaluation error
          }
        }
      }

      // Re-fetch after evaluating
      const refreshedCalls = await prisma.call.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true } },
          agent: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
          qaEvaluation: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: refreshedCalls,
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

  static async getCallQA(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      let call = await prisma.call.findFirst({
        where: { OR: [{ id }, { callId: id }] },
        include: {
          lead: true,
          agent: { select: { id: true, name: true, email: true } },
          campaign: true,
          qaEvaluation: true,
        },
      });

      if (!call) {
        res.status(404).json({ success: false, error: 'Call not found' });
        return;
      }

      if (!call.qaEvaluation) {
        await AITranscriptionService.evaluateCall(call.id);
        call = await prisma.call.findUnique({
          where: { id: call.id },
          include: {
            lead: true,
            agent: { select: { id: true, name: true, email: true } },
            campaign: true,
            qaEvaluation: true,
          },
        });
      }

      res.json({ success: true, data: call });
    } catch (err) {
      next(err);
    }
  }

  static async submitAuditorNotes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { auditorNotes, overrideScore } = req.body;

      const call = await prisma.call.findFirst({
        where: { OR: [{ id }, { callId: id }] },
      });

      if (!call) {
        res.status(404).json({ success: false, error: 'Call not found' });
        return;
      }

      const updateData: any = {
        auditorNotes,
        auditorId: req.user?.userId,
        auditedAt: new Date(),
      };

      if (overrideScore !== undefined) {
        updateData.qaScore = Number(overrideScore);
      }

      const updated = await (prisma as any).callQA.update({
        where: { callId: call.id },
        data: updateData,
      });

      res.json({ success: true, message: 'QA review saved successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const allQAs = await (prisma as any).callQA.findMany({
        include: {
          call: {
            include: { agent: { select: { id: true, name: true } } },
          },
        },
      });

      const totalEvaluated = allQAs.length;
      const redFlagsCount = allQAs.filter((q: any) => q.redFlagAlert).length;
      const riskDisclaimedCount = allQAs.filter((q: any) => q.riskDisclaimer).length;

      const totalScore = allQAs.reduce((acc: number, curr: any) => acc + (curr.qaScore || 0), 0);
      const avgScore = totalEvaluated > 0 ? Math.round(totalScore / totalEvaluated) : 0;

      // Agent Breakdown
      const agentScores: Record<string, { name: string; totalScore: number; callsCount: number; redFlags: number }> = {};
      for (const q of allQAs) {
        const agentName = q.call?.agent?.name || 'Unassigned';
        if (!agentScores[agentName]) {
          agentScores[agentName] = { name: agentName, totalScore: 0, callsCount: 0, redFlags: 0 };
        }
        agentScores[agentName].totalScore += q.qaScore || 0;
        agentScores[agentName].callsCount += 1;
        if (q.redFlagAlert) agentScores[agentName].redFlags += 1;
      }

      const agentRanking = Object.values(agentScores).map((a) => ({
        name: a.name,
        avgScore: Math.round(a.totalScore / a.callsCount),
        callsCount: a.callsCount,
        redFlags: a.redFlags,
      })).sort((a, b) => b.avgScore - a.avgScore);

      res.json({
        success: true,
        data: {
          totalEvaluated,
          avgScore,
          redFlagsCount,
          riskDisclaimedCount,
          agentRanking,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
