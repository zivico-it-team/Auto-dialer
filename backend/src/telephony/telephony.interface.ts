import { EventEmitter } from 'events';
import { DialOptions, DialResult, ActiveChannel, AgentSIPStatus } from './telephony.types.js';

export interface ITelephonyProvider extends EventEmitter {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  dial(options: DialOptions): Promise<DialResult>;
  hangup(callId: string): Promise<boolean>;
  getAgentStatus(extension: string): Promise<AgentSIPStatus>;
  getActiveChannels(): Promise<ActiveChannel[]>;
  isConnected(): boolean;
}
