import { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { dialerEngine } from '../workers/dialerEngine.js';
import { telephonyService } from '../telephony/telephonyService.js';

export class MonitoringController {
  static async getLiveSnapshot(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Fetch Agents with real-time profile and active call
      const agents = await prisma.user.findMany({
        where: { role: 'AGENT' },
        select: {
          id: true,
          name: true,
          email: true,
          agentProfile: true,
          assignedCalls: {
            where: {
              status: { in: ['QUEUED', 'DIALING', 'RINGING', 'ANSWERED'] },
            },
            include: { lead: true, campaign: true },
            take: 1,
          },
        },
      });

      // 2. Fetch Active Calls
      const activeCalls = await prisma.call.findMany({
        where: {
          status: { in: ['QUEUED', 'DIALING', 'RINGING', 'ANSWERED'] },
        },
        include: {
          lead: true,
          campaign: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
      });

      // 3. Campaign Statuses
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: { in: ['RUNNING', 'PAUSED', 'READY'] },
        },
        include: {
          _count: { select: { leads: true } },
        },
      });

      // 4. Telephony active channels
      const activeChannels = await telephonyService.getActiveChannels();

      const totalAgents = agents.length;
      const agentsOnline = agents.filter(
        (a) => a.agentProfile && a.agentProfile.status !== 'OFFLINE'
      ).length;
      const agentsOnCall = agents.filter(
        (a) => a.agentProfile && a.agentProfile.status === 'ON_CALL'
      ).length;
      const agentsAvailable = agents.filter(
        (a) => a.agentProfile && a.agentProfile.status === 'AVAILABLE'
      ).length;

      res.json({
        success: true,
        data: {
          isEmergencyStopped: dialerEngine.isEmergencyStopped(),
          telephonyProvider: telephonyService.name,
          telephonyConnected: telephonyService.isConnected(),
          summary: {
            totalAgents,
            agentsOnline,
            agentsOnCall,
            agentsAvailable,
            activeCallsCount: activeCalls.length,
            activeCampaignsCount: campaigns.filter((c) => c.status === 'RUNNING').length,
          },
          agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            sipExtension: a.agentProfile?.sipExtension,
            status: a.agentProfile?.status || 'OFFLINE',
            lastSeenAt: a.agentProfile?.lastSeenAt,
            currentCall: a.assignedCalls[0] || null,
          })),
          activeCalls,
          campaigns,
          activeChannels,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
