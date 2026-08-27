import { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class ReportController {
  static async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaignId = req.query.campaignId as string;
      const agentId = req.query.agentId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const where: any = {};
      if (campaignId) where.campaignId = campaignId;
      if (agentId) where.agentId = agentId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Total Calls
      const totalCalls = await prisma.call.count({ where });

      // Breakdown by status
      const statusCounts = await prisma.call.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      });

      const answeredCalls = await prisma.call.count({
        where: {
          ...where,
          status: 'ENDED',
          durationSeconds: { gt: 0 },
        },
      });

      const noAnswerCalls = await prisma.call.count({
        where: { ...where, status: 'NO_ANSWER' },
      });

      const busyCalls = await prisma.call.count({
        where: { ...where, status: 'BUSY' },
      });

      const failedCalls = await prisma.call.count({
        where: { ...where, status: 'FAILED' },
      });

      // Duration aggregates
      const durationStats = await prisma.call.aggregate({
        where: {
          ...where,
          status: 'ENDED',
          durationSeconds: { gt: 0 },
        },
        _avg: { durationSeconds: true },
        _sum: { durationSeconds: true },
      });

      const avgDuration = Math.round(durationStats._avg.durationSeconds || 0);
      const totalTalkTime = durationStats._sum.durationSeconds || 0;
      const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

      // Disposition breakdown
      const dispositionCounts = await prisma.call.groupBy({
        by: ['disposition'],
        where: { ...where, disposition: { not: null } },
        _count: { _all: true },
      });

      // Hourly call distribution for Recharts
      const callsForHourly = await prisma.call.findMany({
        where,
        select: { createdAt: true, status: true, durationSeconds: true },
      });

      const hourlyMap: Record<number, { hour: string; total: number; answered: number }> = {};
      for (let h = 0; h < 24; h++) {
        hourlyMap[h] = {
          hour: `${h.toString().padStart(2, '0')}:00`,
          total: 0,
          answered: 0,
        };
      }

      for (const c of callsForHourly) {
        const h = new Date(c.createdAt).getHours();
        if (hourlyMap[h]) {
          hourlyMap[h].total++;
          if (c.status === 'ENDED' && c.durationSeconds > 0) {
            hourlyMap[h].answered++;
          }
        }
      }

      const hourlyData = Object.values(hourlyMap);

      res.json({
        success: true,
        data: {
          metrics: {
            totalCalls,
            answeredCalls,
            noAnswerCalls,
            busyCalls,
            failedCalls,
            avgDurationSeconds: avgDuration,
            totalTalkTimeSeconds: totalTalkTime,
            answerRatePercent: answerRate,
          },
          statusBreakdown: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
          dispositionBreakdown: dispositionCounts.map((d) => ({
            disposition: d.disposition || 'Unassigned',
            count: d._count._all,
          })),
          hourlyData,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportReportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const calls = await prisma.call.findMany({
        include: {
          lead: { select: { name: true, phone: true } },
          campaign: { select: { name: true } },
          agent: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      let csv = 'CallID,Campaign,LeadName,LeadPhone,Agent,Status,Direction,DurationSec,Disposition,HangupCause,Date\r\n';
      for (const c of calls) {
        const leadName = c.lead?.name || c.leadName || 'Contact';
        const leadPhone = c.lead?.phone || c.leadPhone || '';
        csv += `"${c.callId}","${c.campaign.name.replace(/"/g, '""')}","${leadName.replace(/"/g, '""')}","${leadPhone}","${c.agent?.name || 'Unassigned'}","${c.status}","${c.direction}",${c.durationSeconds},"${c.disposition || ''}","${c.hangupCause || ''}","${c.createdAt.toISOString()}"\r\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="call_center_report.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
