export type TelephonyCallStatus =
  | 'QUEUED'
  | 'DIALING'
  | 'RINGING'
  | 'ANSWERED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'FAILED'
  | 'ENDED'
  | 'CANCELLED';

export type AgentSIPStatus =
  | 'UNREGISTERED'
  | 'AVAILABLE'
  | 'RINGING'
  | 'ON_CALL'
  | 'PAUSED'
  | 'OFFLINE';

export interface DialOptions {
  callId: string;
  phoneNumber: string;
  agentExtension?: string;
  campaignId: string;
  leadId: string;
  record?: boolean;
  timeoutSeconds?: number;
  callerId?: string;
}

export interface DialResult {
  success: boolean;
  callId: string;
  channel?: string;
  error?: string;
}

export interface ActiveChannel {
  callId: string;
  channel: string;
  state: TelephonyCallStatus;
  phoneNumber: string;
  agentExtension?: string;
  campaignId: string;
  leadId: string;
  startedAt: Date;
  answeredAt?: Date;
  durationSeconds: number;
}

export interface TelephonyEventMap {
  'call:dialing': { callId: string; channel: string; timestamp: Date };
  'call:ringing': { callId: string; channel: string; timestamp: Date };
  'call:answered': { callId: string; channel: string; timestamp: Date; agentExtension?: string };
  'call:ended': {
    callId: string;
    channel: string;
    durationSeconds: number;
    hangupCause: string;
    recordingUrl?: string;
    timestamp: Date;
  };
  'call:failed': { callId: string; reason: string; timestamp: Date };
  'agent:status': { extension: string; status: AgentSIPStatus; timestamp: Date };
}
