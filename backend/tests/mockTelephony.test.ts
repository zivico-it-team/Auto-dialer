import { describe, it, expect } from 'vitest';
import { MockTelephonyProvider } from '../src/telephony/mockTelephonyProvider.js';

describe('MockTelephonyProvider Simulation & Events', () => {
  it('should connect, dial, and emit expected event sequence', async () => {
    const provider = new MockTelephonyProvider({
      fastMode: true,
      fixedOutcome: 'ANSWERED',
    });

    await provider.connect();
    expect(provider.isConnected()).toBe(true);

    const callEvents: string[] = [];

    provider.on('call:dialing', () => callEvents.push('DIALING'));
    provider.on('call:ringing', () => callEvents.push('RINGING'));
    provider.on('call:answered', () => callEvents.push('ANSWERED'));
    provider.on('call:ended', () => callEvents.push('ENDED'));

    const dialResult = await provider.dial({
      callId: 'test-session-999',
      phoneNumber: '+15550009999',
      agentExtension: '101',
      campaignId: 'camp-test',
      leadId: 'lead-test',
    });

    expect(dialResult.success).toBe(true);
    expect(dialResult.callId).toBe('test-session-999');

    // Wait for fast mode timers to finish (~400ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(callEvents).toEqual(['DIALING', 'RINGING', 'ANSWERED', 'ENDED']);

    await provider.disconnect();
    expect(provider.isConnected()).toBe(false);
  });

  it('should correctly handle manual hangup', async () => {
    const provider = new MockTelephonyProvider({
      fastMode: false,
      fixedOutcome: 'ANSWERED',
      ringTimeMs: 100,
    });

    await provider.connect();

    let endedFired = false;
    provider.on('call:ended', () => {
      endedFired = true;
    });

    await provider.dial({
      callId: 'manual-hangup-123',
      phoneNumber: '+15550008888',
      agentExtension: '102',
      campaignId: 'camp-test',
      leadId: 'lead-test',
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const hungUp = await provider.hangup('manual-hangup-123');
    expect(hungUp).toBe(true);
    expect(endedFired).toBe(true);

    await provider.disconnect();
  });
});
