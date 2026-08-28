import net from 'net';
import { EventEmitter } from 'events';
import { ITelephonyProvider } from './telephony.interface.js';
import { DialOptions, DialResult, ActiveChannel, AgentSIPStatus } from './telephony.types.js';
import { logger } from '../utils/logger.js';

export interface AsteriskConfig {
  host: string;
  port: number;
  username: string;
  secret: string;
  context?: string;
  outboundTrunk?: string;
  outboundPrefix?: string;
}

export class AsteriskAmiProvider extends EventEmitter implements ITelephonyProvider {
  public readonly name = 'AsteriskAmiProvider';
  private socket: net.Socket | null = null;
  private config: AsteriskConfig;
  private connected = false;
  private loggedIn = false;
  private buffer = '';
  private activeChannelsMap = new Map<string, ActiveChannel>(); // callId -> ActiveChannel
  private channelToCallIdMap = new Map<string, string>(); // Asterisk channel name -> callId
  private actionCallbacks = new Map<string, (response: Record<string, string>) => void>();
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: AsteriskConfig) {
    super();
    this.config = {
      context: 'from-internal',
      outboundTrunk: 'SIP/trunk_provider',
      ...config,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      logger.info(`📞 [AsteriskAMI] Connecting to ${this.config.host}:${this.config.port}...`);
      
      this.socket = new net.Socket();
      this.socket.setKeepAlive(true, 5000);

      this.socket.on('connect', () => {
        logger.info('📞 [AsteriskAMI] Socket connected. Awaiting Asterisk banner...');
        this.connected = true;
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data.toString('utf-8'));
      });

      this.socket.on('error', (err: Error) => {
        logger.error(`📞 [AsteriskAMI] Socket error: ${err.message}`);
        this.handleDisconnect();
      });

      this.socket.on('close', () => {
        logger.warn('📞 [AsteriskAMI] Connection closed.');
        this.handleDisconnect();
      });

      // Set timeout for initial connection attempt
      setTimeout(() => {
        if (!this.loggedIn) {
          logger.warn('📞 [AsteriskAMI] Connection login pending or PBX unreachable.');
        }
        resolve();
      }, 2000);
    });
  }

  private handleDisconnect() {
    this.connected = false;
    this.loggedIn = false;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect().catch(() => {});
      }, 10000);
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      if (this.loggedIn) {
        this.sendAction({ Action: 'Logoff' });
      }
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.loggedIn = false;
    this.activeChannelsMap.clear();
    this.channelToCallIdMap.clear();
    logger.info('📞 [AsteriskAMI] Disconnected successfully.');
  }

  isConnected(): boolean {
    return this.connected && this.loggedIn;
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    const packets = this.buffer.split(/\r?\n\r?\n/);
    this.buffer = packets.pop() || '';

    for (const packet of packets) {
      if (packet.startsWith('Asterisk Call Manager')) {
        logger.info(`📞 [AsteriskAMI] Banner received: ${packet.trim()}. Sending Login action...`);
        this.login();
        continue;
      }

      const headers = this.parsePacket(packet);
      if (headers['Response']) {
        this.handleResponse(headers);
      } else if (headers['Event']) {
        this.handleEvent(headers);
      }
    }
  }

  private parsePacket(packet: string): Record<string, string> {
    const lines = packet.split(/\r?\n/);
    const headers: Record<string, string> = {};
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        headers[key] = value;
      }
    }
    return headers;
  }

  private login() {
    const actionId = `LOGIN_${Date.now()}`;
    this.sendAction(
      {
        Action: 'Login',
        Username: this.config.username,
        Secret: this.config.secret,
        ActionID: actionId,
      },
      (res) => {
        if (res['Response'] === 'Success') {
          this.loggedIn = true;
          logger.info('✅ [AsteriskAMI] Authentication successful.');
        } else {
          logger.error(`❌ [AsteriskAMI] Login failed: ${res['Message'] || 'Unknown error'}`);
        }
      }
    );
  }

  private sendAction(
    action: Record<string, string>,
    callback?: (response: Record<string, string>) => void
  ) {
    if (!this.socket || !this.connected) {
      logger.warn(`📞 [AsteriskAMI] Cannot send action ${action['Action']}, socket not connected.`);
      return;
    }

    if (action['ActionID'] && callback) {
      this.actionCallbacks.set(action['ActionID'], callback);
    }

    let payload = '';
    for (const [key, value] of Object.entries(action)) {
      payload += `${key}: ${value}\r\n`;
    }
    payload += '\r\n';

    this.socket.write(payload);
  }

  private handleResponse(res: Record<string, string>) {
    const actionId = res['ActionID'];
    if (actionId && this.actionCallbacks.has(actionId)) {
      const cb = this.actionCallbacks.get(actionId)!;
      this.actionCallbacks.delete(actionId);
      cb(res);
    }
  }

  private handleEvent(evt: Record<string, string>) {
    const eventName = evt['Event'];
    const channel = evt['Channel'] || '';
    const callId = evt['Variable_CALL_ID'] || this.channelToCallIdMap.get(channel);

    switch (eventName) {
      case 'OriginateResponse': {
        const actionCallId = evt['ActionID']?.replace('DIAL_', '');
        if (actionCallId && evt['Response'] !== 'Success') {
          this.emit('call:failed', {
            callId: actionCallId,
            reason: evt['Reason'] || 'Originate failed',
            timestamp: new Date(),
          });
        }
        break;
      }

      case 'DialBegin': {
        if (callId) {
          this.emit('call:ringing', {
            callId,
            channel,
            timestamp: new Date(),
          });
        }
        break;
      }

      case 'BridgeEnter': {
        if (callId) {
          const ch = this.activeChannelsMap.get(callId);
          if (ch) {
            ch.state = 'ANSWERED';
            ch.answeredAt = new Date();
          }
          this.emit('call:answered', {
            callId,
            channel,
            timestamp: new Date(),
            agentExtension: evt['ConnectedLineNum'],
          });
        }
        break;
      }

      case 'Hangup': {
        if (callId) {
          const ch = this.activeChannelsMap.get(callId);
          const duration = ch?.answeredAt
            ? Math.round((Date.now() - ch.answeredAt.getTime()) / 1000)
            : 0;

          this.emit('call:ended', {
            callId,
            channel,
            durationSeconds: duration,
            hangupCause: evt['Cause-txt'] || 'NORMAL_CLEARING',
            recordingUrl: `/api/calls/${callId}/recording`,
            timestamp: new Date(),
          });

          this.activeChannelsMap.delete(callId);
          this.channelToCallIdMap.delete(channel);
        }
        break;
      }

      case 'PeerStatus': {
        const peer = evt['Peer'] || '';
        const exten = peer.replace(/^SIP\/|^PJSIP\//, '');
        const peerStatus = evt['PeerStatus'];
        const status: AgentSIPStatus = peerStatus === 'Registered' || peerStatus === 'Reachable' ? 'AVAILABLE' : 'OFFLINE';
        this.emit('agent:status', {
          extension: exten,
          status,
          timestamp: new Date(),
        });
        break;
      }
    }
  }

  async dial(options: DialOptions): Promise<DialResult> {
    if (!this.isConnected()) {
      return { success: false, callId: options.callId, error: 'Asterisk AMI is not connected' };
    }

    const actionId = `DIAL_${options.callId}`;
    const trunk = this.config.outboundTrunk || 'SIP/trunk_provider';
    const prefix = this.config.outboundPrefix || '';
    let dialedNumber = options.phoneNumber;
    if (prefix && !dialedNumber.startsWith(prefix)) {
      dialedNumber = `${prefix}${dialedNumber}`;
    }
    const channel = `${trunk}/${dialedNumber}`;

    const activeChannel: ActiveChannel = {
      callId: options.callId,
      channel,
      state: 'DIALING',
      phoneNumber: options.phoneNumber,
      agentExtension: options.agentExtension,
      campaignId: options.campaignId,
      leadId: options.leadId,
      startedAt: new Date(),
      durationSeconds: 0,
    };

    this.activeChannelsMap.set(options.callId, activeChannel);
    this.channelToCallIdMap.set(channel, options.callId);

    // Send AMI Originate
    this.sendAction({
      Action: 'Originate',
      Channel: channel,
      Context: this.config.context || 'from-internal',
      Exten: options.agentExtension || 's',
      Priority: '1',
      CallerID: options.callerId || 'AutoDialer',
      Timeout: `${(options.timeoutSeconds || 45) * 1000}`,
      Variable: `CALL_ID=${options.callId}`,
      Async: 'true',
      ActionID: actionId,
    });

    this.emit('call:dialing', {
      callId: options.callId,
      channel,
      timestamp: new Date(),
    });

    return {
      success: true,
      callId: options.callId,
      channel,
    };
  }

  async hangup(callId: string): Promise<boolean> {
    const ch = this.activeChannelsMap.get(callId);
    if (!ch) return false;

    this.sendAction({
      Action: 'Hangup',
      Channel: ch.channel,
    });

    return true;
  }

  async getAgentStatus(extension: string): Promise<AgentSIPStatus> {
    for (const ch of this.activeChannelsMap.values()) {
      if (ch.agentExtension === extension && ch.state === 'ANSWERED') {
        return 'ON_CALL';
      }
    }
    return 'AVAILABLE';
  }

  async getActiveChannels(): Promise<ActiveChannel[]> {
    return Array.from(this.activeChannelsMap.values());
  }
}
