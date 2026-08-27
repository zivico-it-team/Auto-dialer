import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { emitCallEvent } from '../socket/socketEmitter.js';

export type CallState =
  | 'QUEUED'
  | 'DIALING'
  | 'RINGING'
  | 'ANSWERED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'FAILED'
  | 'ENDED'
  | 'CANCELLED';

const VALID_TRANSITIONS: Record<CallState, CallState[]> = {
  QUEUED: ['DIALING', 'CANCELLED', 'FAILED'],
  DIALING: ['RINGING', 'FAILED', 'CANCELLED', 'BUSY', 'NO_ANSWER', 'ANSWERED'],
  RINGING: ['ANSWERED', 'NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED', 'ENDED'],
  ANSWERED: ['ENDED', 'CANCELLED'],
  NO_ANSWER: [],
  BUSY: [],
  FAILED: [],
  ENDED: [],
  CANCELLED: [],
};

export class CallStateMachine {
  /**
   * Validates if a transition from currentState to newState is allowed
   */
  static isValidTransition(current: CallState, next: CallState): boolean {
    if (current === next) return true;
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  /**
   * Performs an atomic call state transition with database update, agent status sync, and real-time socket broadcast
   */
  static async transition(
    callId: string,
    newState: CallState,
    meta?: {
      durationSeconds?: number;
      hangupCause?: string;
      disposition?: string;
      notes?: string;
      recordingUrl?: string;
      agentId?: string;
    }
  ): Promise<any> {
    try {
      const call = await prisma.call.findUnique({
        where: { callId },
        include: { lead: true, campaign: true },
      });

      if (!call) {
        logger.warn(`Cannot transition unknown call: ${callId}`);
        return null;
      }

      const currentState = call.status as CallState;
      if (!this.isValidTransition(currentState, newState)) {
        logger.warn(`Invalid state transition attempted: ${currentState} -> ${newState} for call ${callId}`);
      }

      const updateData: any = {
        status: newState,
        updatedAt: new Date(),
      };

      if (newState === 'ANSWERED' && !call.answeredAt) {
        updateData.answeredAt = new Date();
      }

      if (['ENDED', 'NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED'].includes(newState)) {
        updateData.endedAt = new Date();
        if (meta?.durationSeconds !== undefined) updateData.durationSeconds = meta.durationSeconds;
        if (meta?.hangupCause) updateData.hangupCause = meta.hangupCause;
        if (meta?.disposition) updateData.disposition = meta.disposition;
        if (meta?.notes) updateData.notes = meta.notes;
        if (meta?.recordingUrl) updateData.recordingUrl = meta.recordingUrl;
      }

      const updatedCall = await prisma.call.update({
        where: { callId },
        data: updateData,
        include: { lead: true, campaign: true, agent: true },
      });

      // Update Lead Status & Retry Schedule accordingly if lead still exists
      if (call.leadId) {
        await this.updateLeadStatusAfterCall(call.leadId, call.campaignId, newState, meta?.disposition);
      }

      // If Agent was attached, update agent presence
      if (call.agentId) {
        let agentStatus = 'AVAILABLE';
        if (newState === 'RINGING') agentStatus = 'RINGING';
        else if (newState === 'ANSWERED') agentStatus = 'ON_CALL';
        else if (['ENDED', 'NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED'].includes(newState)) agentStatus = 'AVAILABLE';

        await prisma.agentProfile.updateMany({
          where: { userId: call.agentId },
          data: { status: agentStatus, lastSeenAt: new Date() },
        });

        emitCallEvent('agent:status', {
          agentId: call.agentId,
          status: agentStatus,
          timestamp: new Date(),
        });
      }

      // Emit real-time call event
      emitCallEvent(`call:${newState.toLowerCase()}`, {
        callId: updatedCall.callId,
        leadId: updatedCall.leadId || undefined,
        leadName: updatedCall.lead?.name || updatedCall.leadName || 'Contact',
        leadPhone: updatedCall.lead?.phone || updatedCall.leadPhone || '',
        campaignId: updatedCall.campaignId,
        campaignName: updatedCall.campaign.name,
        agentId: updatedCall.agentId,
        agentName: updatedCall.agent?.name,
        status: updatedCall.status,
        durationSeconds: updatedCall.durationSeconds,
        hangupCause: updatedCall.hangupCause,
        disposition: updatedCall.disposition,
        recordingUrl: updatedCall.recordingUrl,
        timestamp: new Date(),
      });

      logger.info(`🔄 [CallStateMachine] Call ${callId} -> ${newState}`);
      return updatedCall;
    } catch (error) {
      logger.error(`Error transitioning call ${callId} to ${newState}`, error);
      throw error;
    }
  }

  private static async updateLeadStatusAfterCall(
    leadId: string,
    campaignId: string,
    callState: CallState,
    disposition?: string
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!lead || !campaign) return;

    let leadStatus = lead.status;
    let nextAttemptAt: Date | null = null;
    const attempts = lead.attempts + 1;

    if (disposition === 'Do Not Call' || disposition === 'DO_NOT_CALL') {
      leadStatus = 'DO_NOT_CALL';
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: leadStatus, optedOut: true, attempts, lastAttemptAt: new Date(), nextAttemptAt: null },
      });
      return;
    }

    if (callState === 'ANSWERED' || disposition === 'Completed' || disposition === 'Interested') {
      leadStatus = 'ANSWERED';
    } else if (callState === 'NO_ANSWER') {
      leadStatus = 'NO_ANSWER';
      if (attempts < campaign.retryLimit) {
        nextAttemptAt = new Date(Date.now() + campaign.retryDelaySeconds * 1000);
      } else {
        leadStatus = 'FAILED';
      }
    } else if (callState === 'BUSY') {
      leadStatus = 'BUSY';
      if (attempts < campaign.retryLimit) {
        nextAttemptAt = new Date(Date.now() + Math.min(campaign.retryDelaySeconds, 600) * 1000); // 10 min or config
      } else {
        leadStatus = 'FAILED';
      }
    } else if (callState === 'FAILED') {
      leadStatus = 'FAILED';
      if (attempts < campaign.retryLimit) {
        nextAttemptAt = new Date(Date.now() + campaign.retryDelaySeconds * 1000);
      }
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: leadStatus,
        attempts,
        lastAttemptAt: new Date(),
        nextAttemptAt,
      },
    });
  }
}
