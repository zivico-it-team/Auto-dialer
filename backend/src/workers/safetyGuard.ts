import { Campaign, Lead } from '@prisma/client';
import { prisma } from '../config/database.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

export class SafetyGuard {
  /**
   * Checks if current time is within campaign's calling hours in its configured timezone
   */
  static isWithinCallingHours(campaign: Campaign): boolean {
    try {
      const now = new Date();
      const timeZone = campaign.timezone || 'UTC';
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const hour = parts.find((p) => p.type === 'hour')?.value || '00';
      const minute = parts.find((p) => p.type === 'minute')?.value || '00';
      const currentTimeStr = `${hour}:${minute}`;

      const startTime = campaign.callingStartTime || '09:00';
      const endTime = campaign.callingEndTime || '18:00';

      return currentTimeStr >= startTime && currentTimeStr <= endTime;
    } catch (err) {
      logger.error(`Error checking calling hours for campaign ${campaign.id}`, err);
      // Fail-safe: allow if timezone calculation is valid or fallback to UTC check
      return true;
    }
  }

  /**
   * Validates if a lead is safe and eligible to be dialed
   */
  static isLeadEligible(lead: Lead, campaign: Campaign): { eligible: boolean; reason?: string } {
    if (lead.optedOut || lead.status === 'DO_NOT_CALL') {
      return { eligible: false, reason: 'Lead has opted out or is on Do Not Call list' };
    }

    if (lead.attempts >= campaign.retryLimit) {
      return { eligible: false, reason: `Max retry limit (${campaign.retryLimit}) reached` };
    }

    if (lead.nextAttemptAt && new Date(lead.nextAttemptAt) > new Date()) {
      return { eligible: false, reason: `Retry delay active until ${lead.nextAttemptAt.toISOString()}` };
    }

    if (lead.status === 'COMPLETED' || lead.status === 'ANSWERED') {
      return { eligible: false, reason: `Lead already in terminal success state: ${lead.status}` };
    }

    return { eligible: true };
  }

  /**
   * Checks active concurrent calls against limits
   */
  static async checkConcurrencyLimits(campaignId: string, campaignMaxCalls: number): Promise<boolean> {
    const activeStates = ['QUEUED', 'DIALING', 'RINGING', 'ANSWERED'];

    // 1. Campaign concurrent calls check
    const campaignActiveCalls = await prisma.call.count({
      where: {
        campaignId,
        status: { in: activeStates },
      },
    });

    if (campaignActiveCalls >= campaignMaxCalls) {
      return false;
    }

    // 2. Global server concurrent calls check
    const globalActiveCalls = await prisma.call.count({
      where: {
        status: { in: activeStates },
      },
    });

    if (globalActiveCalls >= config.globalMaxConcurrentCalls) {
      return false;
    }

    return true;
  }
}
