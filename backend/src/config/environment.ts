import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const frontendUrls = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrls,
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_call_center_dialer',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Telephony
  telephonyProvider: process.env.TELEPHONY_PROVIDER || 'mock', // 'mock' or 'asterisk'
  asterisk: {
    host: process.env.ASTERISK_HOST || '127.0.0.1',
    port: parseInt(process.env.ASTERISK_PORT || '5038', 10),
    username: process.env.ASTERISK_USERNAME || 'admin',
    password: process.env.ASTERISK_PASSWORD || 'asterisk',
    context: process.env.ASTERISK_CALL_CONTEXT || 'from-internal',
    outboundTrunk: process.env.ASTERISK_OUTBOUND_TRUNK || 'SIP/trunk_provider',
  },
  sip: {
    domain: process.env.SIP_DOMAIN || '127.0.0.1',
    port: parseInt(process.env.SIP_PORT || '5060', 10),
  },
  
  // Recording
  recordingStoragePath: path.resolve(process.env.RECORDING_STORAGE_PATH || './recordings'),
  recordingEnabledDefault: process.env.RECORDING_ENABLED_DEFAULT === 'true',

  // Concurrency & Safety
  globalMaxConcurrentCalls: parseInt(process.env.GLOBAL_MAX_CONCURRENT_CALLS || '10', 10),
  defaultCallingStartTime: process.env.DEFAULT_CALLING_START_TIME || '09:00',
  defaultCallingEndTime: process.env.DEFAULT_CALLING_END_TIME || '18:00',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
};
