import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { telephonyService } from '../telephony/telephonyService.js';
import { SafetyGuard } from './safetyGuard.js';
import { CallStateMachine } from './callStateMachine.js';
import { logger } from '../utils/logger.js';
import { emitCampaignEvent, emitCallEvent } from '../socket/socketEmitter.js';

export class DialerEngine {
  private static instance: DialerEngine;
  private isRunning = false;
  private isProcessing = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private emergencyStopped = false;
  private dialingLocks = new Set<string>(); // Prevent race conditions on lead IDs

  private constructor() {
    this.setupTelephonyEventListeners();
  }

  public static getInstance(): DialerEngine {
    if (!DialerEngine.instance) {
      DialerEngine.instance = new DialerEngine();
    }
    return DialerEngine.instance;
  }

  private setupTelephonyEventListeners() {
    telephonyService.on('call:dialing', async (evt) => {
      try {
        await CallStateMachine.transition(evt.callId, 'DIALING');
      } catch (err) {
        logger.error(`Error handling call:dialing event`, err);
      }
    });

    telephonyService.on('call:ringing', async (evt) => {
      try {
        await CallStateMachine.transition(evt.callId, 'RINGING');
      } catch (err) {
        logger.error(`Error handling call:ringing event`, err);
      }
    });

    telephonyService.on('call:answered', async (evt) => {
      try {
        await CallStateMachine.transition(evt.callId, 'ANSWERED');
      } catch (err) {
        logger.error(`Error handling call:answered event`, err);
      }
    });

    telephonyService.on('call:ended', async (evt) => {
      try {
        let disposition = 'Completed';
        if (evt.hangupCause === 'NO_ANSWER') disposition = 'No Answer';
        else if (evt.hangupCause === 'USER_BUSY' || evt.hangupCause === 'BUSY') disposition = 'Busy';

        await CallStateMachine.transition(evt.callId, 'ENDED', {
          durationSeconds: evt.durationSeconds,
          hangupCause: evt.hangupCause,
          recordingUrl: evt.recordingUrl,
          disposition,
        });

        // Trigger next dial attempt immediately for back-to-back dialing
        setImmediate(() => this.processDialerTick());
      } catch (err) {
        logger.error(`Error handling call:ended event`, err);
      }
    });

    telephonyService.on('call:failed', async (evt) => {
      try {
        await CallStateMachine.transition(evt.callId, 'FAILED', {
          hangupCause: evt.reason,
          disposition: 'Failed',
        });
        // Trigger next dial attempt
        setImmediate(() => this.processDialerTick());
      } catch (err) {
        logger.error(`Error handling call:failed event`, err);
      }
    });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('🚀 [DialerEngine] Starting background dialer loop...');

    this.loopInterval = setInterval(() => {
      this.processDialerTick().catch((err) => {
        logger.error('Error in dialer loop tick', err);
      });
    }, 3000);
  }

  public stop() {
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    logger.info('🛑 [DialerEngine] Background dialer loop stopped.');
  }

  /**
   * Main dialer processing tick
   */
  public async processDialerTick() {
    if (!this.isRunning || this.emergencyStopped || this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Fetch all RUNNING campaigns
      const runningCampaigns = await prisma.campaign.findMany({
        where: { status: 'RUNNING' },
      });

      if (runningCampaigns.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const campaign of runningCampaigns) {
        if (this.emergencyStopped) break;

        // 2. Check calling hours compliance
        if (!SafetyGuard.isWithinCallingHours(campaign)) {
          logger.debug(`Campaign ${campaign.name} is outside configured calling hours.`);
          continue;
        }

        // 3. Check concurrency limits
        const canDialMore = await SafetyGuard.checkConcurrencyLimits(
          campaign.id,
          campaign.maxConcurrentCalls
        );
        if (!canDialMore) {
          continue;
        }

        // 4. Find available agent for this campaign
        const availableAgent = await this.findAvailableAgent();

        // 5. Select next eligible lead
        const nextLead = await this.findNextEligibleLead(campaign.id, campaign.retryLimit);
        if (!nextLead) {
          // Check if campaign is completed (no more leads to dial)
          await this.checkAndCompleteCampaign(campaign.id);
          continue;
        }

        // 6. Initiate Call
        await this.initiateCall(campaign, nextLead, availableAgent);
      }
    } catch (error) {
      logger.error('Error during dialer tick execution', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async findAvailableAgent(): Promise<{ id: string; name: string; extension?: string } | null> {
    const agentProfile = await prisma.agentProfile.findFirst({
      where: {
        status: 'AVAILABLE',
        user: { status: 'ACTIVE' },
      },
      include: {
        user: true,
      },
    });

    if (!agentProfile || !agentProfile.user) {
      return null;
    }

    return {
      id: agentProfile.user.id,
      name: agentProfile.user.name,
      extension: agentProfile.sipExtension || undefined,
    };
  }

  private async findNextEligibleLead(campaignId: string, retryLimit: number) {
    const now = new Date();

    const lead = await prisma.lead.findFirst({
      where: {
        campaignId,
        optedOut: false,
        status: {
          in: ['NEW', 'QUEUED', 'CALLBACK', 'NO_ANSWER', 'BUSY', 'FAILED'],
        },
        attempts: {
          lt: retryLimit,
        },
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: now } },
        ],
      },
      orderBy: [
        { status: 'asc' }, // CALLBACK and NEW come before retry statuses
        { attempts: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (lead && this.dialingLocks.has(lead.id)) {
      return null;
    }

    return lead;
  }

  private async initiateCall(
    campaign: any,
    lead: any,
    agent: { id: string; name: string; extension?: string } | null
  ) {
    this.dialingLocks.add(lead.id);
    const callSessionId = `CALL-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
      // 1. Create Call Record in Database
      const call = await prisma.call.create({
        data: {
          callId: callSessionId,
          campaignId: campaign.id,
          leadId: lead.id,
          leadName: lead.name,
          leadPhone: lead.phone,
          agentId: agent ? agent.id : null,
          direction: 'OUTBOUND',
          status: 'QUEUED',
          startedAt: new Date(),
        },
      });

      // 2. Mark Lead as QUEUED
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'QUEUED' },
      });

      // 3. Mark Agent as RINGING if assigned
      if (agent) {
        await prisma.agentProfile.updateMany({
          where: { userId: agent.id },
          data: { status: 'RINGING', lastSeenAt: new Date() },
        });
      }

      emitCallEvent('call:queued', {
        callId: call.callId,
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        campaignId: campaign.id,
        campaignName: campaign.name,
        agentId: agent?.id,
        agentName: agent?.name,
        status: 'QUEUED',
        timestamp: new Date(),
      });

      logger.info(`📞 [DialerEngine] Originating call ${callSessionId} -> ${lead.phone} (Agent: ${agent?.name || 'Unassigned'})`);

      // 4. Request dial through Telephony Service
      const result = await telephonyService.dial({
        callId: callSessionId,
        phoneNumber: lead.phone,
        agentExtension: agent?.extension,
        campaignId: campaign.id,
        leadId: lead.id,
        record: campaign.recordCalls,
      });

      if (!result.success) {
        logger.warn(`Failed to originate call ${callSessionId}: ${result.error}`);
        await CallStateMachine.transition(callSessionId, 'FAILED', {
          hangupCause: result.error || 'Dial initiation failed',
        });
      }
    } catch (err) {
      logger.error(`Error in initiateCall for lead ${lead.id}`, err);
      this.dialingLocks.delete(lead.id);
    } finally {
      setTimeout(() => {
        this.dialingLocks.delete(lead.id);
      }, 5000);
    }
  }

  private async checkAndCompleteCampaign(campaignId: string) {
    const pendingLeads = await prisma.lead.count({
      where: {
        campaignId,
        optedOut: false,
        status: { in: ['NEW', 'QUEUED', 'CALLBACK', 'NO_ANSWER', 'BUSY', 'FAILED'] },
        attempts: { lt: 3 },
      },
    });

    const activeCalls = await prisma.call.count({
      where: {
        campaignId,
        status: { in: ['QUEUED', 'DIALING', 'RINGING', 'ANSWERED'] },
      },
    });

    if (pendingLeads === 0 && activeCalls === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' },
      });
      emitCampaignEvent('campaign:completed', { campaignId, status: 'COMPLETED' });
      logger.info(`🎉 [DialerEngine] Campaign ${campaignId} marked as COMPLETED.`);
    }
  }

  // ==========================================
  // Campaign Lifecycle & Emergency Controls
  // ==========================================

  public async startCampaign(campaignId: string) {
    this.emergencyStopped = false;
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' },
    });
    emitCampaignEvent('campaign:status_changed', { campaignId, status: 'RUNNING' });
    logger.info(`▶️ Campaign ${campaign.name} started.`);
    setImmediate(() => this.processDialerTick());
    return campaign;
  }

  public async pauseCampaign(campaignId: string) {
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });
    emitCampaignEvent('campaign:status_changed', { campaignId, status: 'PAUSED' });
    logger.info(`⏸️ Campaign ${campaign.name} paused.`);
    return campaign;
  }

  public async stopCampaign(campaignId: string) {
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'STOPPED' },
    });
    emitCampaignEvent('campaign:status_changed', { campaignId, status: 'STOPPED' });
    logger.info(`⏹️ Campaign ${campaign.name} stopped.`);
    return campaign;
  }

  /**
   * Emergency STOP: Instantly pauses all active campaigns and freezes queue
   */
  public async emergencyStop(userId?: string) {
    this.emergencyStopped = true;
    logger.warn(`🚨 EMERGENCY STOP ACTIVATED by user ${userId || 'SYSTEM'}`);

    await prisma.campaign.updateMany({
      where: { status: 'RUNNING' },
      data: { status: 'PAUSED' },
    });

    emitCampaignEvent('campaign:emergency_stopped', {
      timestamp: new Date(),
      triggeredBy: userId,
      message: 'All campaigns have been emergency paused.',
    });

    return { success: true, message: 'Emergency stop activated. All running campaigns paused.' };
  }

  public isEmergencyStopped(): boolean {
    return this.emergencyStopped;
  }
}

export const dialerEngine = DialerEngine.getInstance();
