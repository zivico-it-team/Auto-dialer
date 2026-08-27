import { EventEmitter } from 'events';
import { ITelephonyProvider } from './telephony.interface.js';
import { DialOptions, DialResult, ActiveChannel, AgentSIPStatus, TelephonyCallStatus } from './telephony.types.js';
import { logger } from '../utils/logger.js';

export interface MockSimulationConfig {
  fastMode?: boolean; // When true, runs transitions in tens of milliseconds for unit tests
  fixedOutcome?: 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'FAILED';
  ringTimeMs?: number;
  callDurationMs?: number;
}

export class MockTelephonyProvider extends EventEmitter implements ITelephonyProvider {
  public readonly name = 'MockTelephonyProvider';
  private connected = false;
  private activeChannelsMap = new Map<string, ActiveChannel>();
  private activeTimers = new Map<string, NodeJS.Timeout[]>();
  private simulationConfig: MockSimulationConfig = {};

  constructor(config?: MockSimulationConfig) {
    super();
    if (config) {
      this.simulationConfig = config;
    }
  }

  public setSimulationConfig(config: MockSimulationConfig) {
    this.simulationConfig = { ...this.simulationConfig, ...config };
  }

  async connect(): Promise<void> {
    this.connected = true;
    logger.info('📞 [MockTelephony] Initialized and connected (Simulated PBX).');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    // Clear all pending timers
    for (const timers of this.activeTimers.values()) {
      timers.forEach((t) => clearTimeout(t));
    }
    this.activeTimers.clear();
    this.activeChannelsMap.clear();
    logger.info('📞 [MockTelephony] Disconnected and all mock channels cleared.');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async dial(options: DialOptions): Promise<DialResult> {
    if (!this.connected) {
      return { success: false, callId: options.callId, error: 'Telephony provider not connected' };
    }

    const channelName = `SIP/MOCK-TRUNK-${options.callId.substring(0, 8)}`;
    const channel: ActiveChannel = {
      callId: options.callId,
      channel: channelName,
      state: 'DIALING',
      phoneNumber: options.phoneNumber,
      agentExtension: options.agentExtension,
      campaignId: options.campaignId,
      leadId: options.leadId,
      startedAt: new Date(),
      durationSeconds: 0,
    };

    this.activeChannelsMap.set(options.callId, channel);
    this.activeTimers.set(options.callId, []);

    // 1. DIALING Event
    this.emit('call:dialing', {
      callId: options.callId,
      channel: channelName,
      timestamp: new Date(),
    });

    const isFast = this.simulationConfig.fastMode ?? false;
    const ringDelay = isFast ? 50 : (this.simulationConfig.ringTimeMs ?? 800);

    // 2. Schedule RINGING Event
    const t1 = setTimeout(() => {
      const ch = this.activeChannelsMap.get(options.callId);
      if (!ch) return;
      ch.state = 'RINGING';
      this.emit('call:ringing', {
        callId: options.callId,
        channel: channelName,
        timestamp: new Date(),
      });

      // 3. Determine Outcome
      const outcome = this.simulationConfig.fixedOutcome || this.determineRandomOutcome();
      const outcomeDelay = isFast ? 100 : 1500;

      const t2 = setTimeout(() => {
        this.handleCallOutcome(options, channelName, outcome, isFast);
      }, outcomeDelay);

      this.addTimer(options.callId, t2);
    }, ringDelay);

    this.addTimer(options.callId, t1);

    return {
      success: true,
      callId: options.callId,
      channel: channelName,
    };
  }

  private determineRandomOutcome(): 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'FAILED' {
    const rand = Math.random() * 100;
    if (rand < 70) return 'ANSWERED'; // 70% answered
    if (rand < 85) return 'NO_ANSWER'; // 15% no answer
    if (rand < 95) return 'BUSY'; // 10% busy
    return 'FAILED'; // 5% failed
  }

  private handleCallOutcome(
    options: DialOptions,
    channelName: string,
    outcome: 'ANSWERED' | 'NO_ANSWER' | 'BUSY' | 'FAILED',
    isFast: boolean
  ) {
    const ch = this.activeChannelsMap.get(options.callId);
    if (!ch) return;

    if (outcome === 'ANSWERED') {
      ch.state = 'ANSWERED';
      ch.answeredAt = new Date();
      this.emit('call:answered', {
        callId: options.callId,
        channel: channelName,
        timestamp: new Date(),
        agentExtension: options.agentExtension,
      });

      // Simulate call conversation duration
      const durationMs = isFast
        ? 150
        : (this.simulationConfig.callDurationMs ?? Math.floor(Math.random() * 4000 + 2000));
      
      const t3 = setTimeout(() => {
        this.endCall(options.callId, 'NORMAL_CLEARING', Math.max(1, Math.round(durationMs / 1000)));
      }, durationMs);

      this.addTimer(options.callId, t3);
    } else if (outcome === 'NO_ANSWER') {
      ch.state = 'NO_ANSWER';
      this.endCall(options.callId, 'NO_ANSWER', 0);
    } else if (outcome === 'BUSY') {
      ch.state = 'BUSY';
      this.endCall(options.callId, 'USER_BUSY', 0);
    } else {
      ch.state = 'FAILED';
      this.emit('call:failed', {
        callId: options.callId,
        reason: 'CIRCUIT_CONGESTION',
        timestamp: new Date(),
      });
      this.cleanupCall(options.callId);
    }
  }

  private endCall(callId: string, hangupCause: string, durationSeconds: number) {
    const ch = this.activeChannelsMap.get(callId);
    if (!ch) return;

    ch.state = 'ENDED';
    ch.durationSeconds = durationSeconds;
    const recordingUrl = `/api/calls/${callId}/recording`;

    this.emit('call:ended', {
      callId,
      channel: ch.channel,
      durationSeconds,
      hangupCause,
      recordingUrl,
      timestamp: new Date(),
    });

    this.cleanupCall(callId);
  }

  async hangup(callId: string): Promise<boolean> {
    const ch = this.activeChannelsMap.get(callId);
    if (!ch) return false;

    const duration = ch.answeredAt
      ? Math.max(1, Math.round((Date.now() - ch.answeredAt.getTime()) / 1000))
      : 0;

    this.endCall(callId, 'AGENT_HUNGUP', duration);
    return true;
  }

  async getAgentStatus(extension: string): Promise<AgentSIPStatus> {
    // In mock provider, all configured extensions report AVAILABLE unless currently on call
    for (const ch of this.activeChannelsMap.values()) {
      if (ch.agentExtension === extension && (ch.state === 'RINGING' || ch.state === 'ANSWERED')) {
        return ch.state === 'RINGING' ? 'RINGING' : 'ON_CALL';
      }
    }
    return 'AVAILABLE';
  }

  async getActiveChannels(): Promise<ActiveChannel[]> {
    return Array.from(this.activeChannelsMap.values());
  }

  private addTimer(callId: string, timer: NodeJS.Timeout) {
    const timers = this.activeTimers.get(callId) || [];
    timers.push(timer);
    this.activeTimers.set(callId, timers);
  }

  private cleanupCall(callId: string) {
    const timers = this.activeTimers.get(callId);
    if (timers) {
      timers.forEach((t) => clearTimeout(t));
      this.activeTimers.delete(callId);
    }
    this.activeChannelsMap.delete(callId);
  }
}
