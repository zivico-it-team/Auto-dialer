import { describe, it, expect } from 'vitest';
import { SafetyGuard } from '../src/workers/safetyGuard.js';
import { Campaign, Lead } from '@prisma/client';

describe('SafetyGuard Compliance & Safety Rules', () => {
  it('should block opted-out and DNC leads', () => {
    const mockCampaign: Partial<Campaign> = {
      id: 'camp-1',
      retryLimit: 3,
    };

    const dncLead: Partial<Lead> = {
      id: 'lead-1',
      status: 'DO_NOT_CALL',
      optedOut: true,
      attempts: 0,
    };

    const result = SafetyGuard.isLeadEligible(dncLead as Lead, mockCampaign as Campaign);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Do Not Call');
  });

  it('should block leads exceeding retry limit', () => {
    const mockCampaign: Partial<Campaign> = {
      id: 'camp-1',
      retryLimit: 3,
    };

    const maxedLead: Partial<Lead> = {
      id: 'lead-2',
      status: 'NO_ANSWER',
      optedOut: false,
      attempts: 3,
    };

    const result = SafetyGuard.isLeadEligible(maxedLead as Lead, mockCampaign as Campaign);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Max retry limit');
  });

  it('should block leads with active retry delay in future', () => {
    const mockCampaign: Partial<Campaign> = {
      id: 'camp-1',
      retryLimit: 3,
    };

    const delayLead: Partial<Lead> = {
      id: 'lead-3',
      status: 'NO_ANSWER',
      optedOut: false,
      attempts: 1,
      nextAttemptAt: new Date(Date.now() + 100000), // In future
    };

    const result = SafetyGuard.isLeadEligible(delayLead as Lead, mockCampaign as Campaign);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Retry delay active');
  });

  it('should allow eligible NEW leads', () => {
    const mockCampaign: Partial<Campaign> = {
      id: 'camp-1',
      retryLimit: 3,
    };

    const validLead: Partial<Lead> = {
      id: 'lead-4',
      status: 'NEW',
      optedOut: false,
      attempts: 0,
      nextAttemptAt: null,
    };

    const result = SafetyGuard.isLeadEligible(validLead as Lead, mockCampaign as Campaign);
    expect(result.eligible).toBe(true);
  });
});
