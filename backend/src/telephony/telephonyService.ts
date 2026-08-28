import { ITelephonyProvider } from './telephony.interface.js';
import { MockTelephonyProvider } from './mockTelephonyProvider.js';
import { AsteriskAmiProvider } from './asteriskAmiProvider.js';
import { ImpactPbxProvider } from './impactPbxProvider.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

class TelephonyServiceManager {
  private provider: ITelephonyProvider;

  constructor() {
    const providerType = (config.telephonyProvider || '').toLowerCase();

    if (providerType === 'impactpbx' || providerType === 'asterisk' || providerType === 'live') {
      logger.info(`🌊 Initializing Live ImpactPBX Telephony Provider (${config.asterisk.host})...`);
      this.provider = new ImpactPbxProvider({
        host: config.asterisk.host || 'talkingwave.impactpbx.com',
        port: config.asterisk.port || 5038,
        username: config.asterisk.username,
        password: config.asterisk.password,
        domain: config.sip.domain || 'talkingwave.impactpbx.com',
        context: config.asterisk.context || 'from-internal',
        outboundTrunk: config.asterisk.outboundTrunk || 'SIP/talkingwave_trunk',
        outboundPrefix: config.asterisk.outboundPrefix || '+',
        apiUrl: 'https://talkingwave.impactpbx.com/app/click_to_call/click_to_call.php',
      });
    } else {
      logger.info('Initializing Mock Telephony Provider (Simulated PBX for local dev/tests)...');
      this.provider = new MockTelephonyProvider();
    }
  }

  public getProvider(): ITelephonyProvider {
    return this.provider;
  }

  public async initialize(): Promise<void> {
    await this.provider.connect();
  }

  public async shutdown(): Promise<void> {
    await this.provider.disconnect();
  }
}

export const telephonyManager = new TelephonyServiceManager();
export const telephonyService = telephonyManager.getProvider();
