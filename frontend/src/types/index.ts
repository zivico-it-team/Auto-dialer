export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'QA_AUDITOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface CallQA {
  id: string;
  callId: string;
  transcriptTanglish?: string;
  transcriptEnglish?: string;
  transcriptTamil?: string;
  summary?: string;
  qaScore?: number;
  grade?: 'A' | 'B' | 'C' | 'F';
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'INTERESTED_HOT';
  riskDisclaimer: boolean;
  redFlagAlert: boolean;
  redFlagReason?: string;
  qaFeedback?: string;
  auditorNotes?: string;
  auditorId?: string;
  auditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AgentStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'RINGING'
  | 'ON_CALL'
  | 'PAUSED'
  | 'BREAK';

export interface AgentProfile {
  id: string;
  userId: string;
  sipUsername?: string;
  sipExtension?: string;
  status: AgentStatus;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  agentProfile?: AgentProfile;
  createdAt: string;
}

export type CampaignStatus =
  | 'DRAFT'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'STOPPED';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  maxConcurrentCalls: number;
  retryLimit: number;
  retryDelaySeconds: number;
  callingStartTime: string;
  callingEndTime: string;
  timezone: string;
  recordCalls: boolean;
  totalLeads?: number;
  completedLeads?: number;
  activeCalls?: number;
  answeredCalls?: number;
  progressPercent?: number;
  leadBreakdown?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'NEW'
  | 'QUEUED'
  | 'CONTACTED'
  | 'ANSWERED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'FAILED'
  | 'CALLBACK'
  | 'COMPLETED'
  | 'DO_NOT_CALL';

export interface Lead {
  id: string;
  campaignId: string;
  campaign?: { id: string; name: string };
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  optedOut: boolean;
  notes?: string;
  customFields?: string | Record<string, any>;
  createdAt: string;
  updatedAt: string;
  calls?: Call[];
  callbacks?: Callback[];
}

export type CallStatus =
  | 'QUEUED'
  | 'DIALING'
  | 'RINGING'
  | 'ANSWERED'
  | 'NO_ANSWER'
  | 'BUSY'
  | 'FAILED'
  | 'ENDED'
  | 'CANCELLED';

export interface Call {
  id: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  campaignId: string;
  agentId?: string;
  callId: string;
  direction: 'OUTBOUND' | 'INBOUND';
  status: CallStatus;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  hangupCause?: string;
  disposition?: string;
  notes?: string;
  recordingUrl?: string;
  qaEvaluation?: CallQA;
  createdAt: string;
  updatedAt: string;
  lead?: { id: string; name: string; phone: string; email?: string };
  campaign?: { id: string; name: string };
  agent?: { id: string; name: string; email?: string };
}

export interface Callback {
  id: string;
  leadId: string;
  campaignId: string;
  agentId?: string;
  scheduledTime: string;
  notes?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  lead?: { id: string; name: string; phone: string; email?: string };
  campaign?: { id: string; name: string };
  agent?: { id: string; name: string; email?: string };
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string };
}

export interface LiveMonitoringData {
  isEmergencyStopped: boolean;
  telephonyProvider: string;
  telephonyConnected: boolean;
  summary: {
    totalAgents: number;
    agentsOnline: number;
    agentsOnCall: number;
    agentsAvailable: number;
    activeCallsCount: number;
    activeCampaignsCount: number;
  };
  agents: {
    id: string;
    name: string;
    email: string;
    sipExtension?: string;
    status: AgentStatus;
    lastSeenAt?: string;
    currentCall?: Call | null;
  }[];
  activeCalls: Call[];
  campaigns: Campaign[];
}

export interface ReportSummary {
  metrics: {
    totalCalls: number;
    answeredCalls: number;
    noAnswerCalls: number;
    busyCalls: number;
    failedCalls: number;
    avgDurationSeconds: number;
    totalTalkTimeSeconds: number;
    answerRatePercent: number;
  };
  statusBreakdown: { status: string; count: number }[];
  dispositionBreakdown: { disposition: string; count: number }[];
  hourlyData: { hour: string; total: number; answered: number }[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
