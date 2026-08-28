import { ITelephonyProvider } from './telephony.interface.js';
import { MockTelephonyProvider } from './mockTelephonyProvider.js';
import { AsteriskAmiProvider } from './asteriskAmiProvider.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

class TelephonyServiceManager {
  private provider: ITelephonyProvider;

  constructor() {
    if (config.telephonyProvider === 'asterisk') {
      logger.info('Initializing Asterisk AMI Telephony Provider...');
      this.provider = new AsteriskAmiProvider({
        host: config.asterisk.host,
        port: config.asterisk.port,
        username: config.asterisk.username,
        secret: config.asterisk.password,
        context: config.asterisk.context,
        outboundTrunk: config.asterisk.outboundTrunk,
        outboundPrefix: config.asterisk.outboundPrefix,
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
