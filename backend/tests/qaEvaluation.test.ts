import { describe, it, expect } from 'vitest';
import { AITranscriptionService } from '../src/services/aiTranscriptionService.js';
import { prisma } from '../src/config/database.js';

describe('QA Evaluation & Tanglish Transcription Engine', () => {
  it('should generate Tanglish, English, and Tamil transcripts and QA scores', async () => {
    // Find or create a test call
    let call = await prisma.call.findFirst({
      where: { durationSeconds: { gt: 0 } },
    });

    if (!call) {
      const campaign = await prisma.campaign.findFirst();
      const lead = await prisma.lead.findFirst();
      if (campaign && lead) {
        call = await prisma.call.create({
          data: {
            callId: `TEST-QA-${Date.now()}`,
            campaignId: campaign.id,
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone,
            durationSeconds: 75,
            disposition: 'Interested',
            status: 'ENDED',
          },
        });
      }
    }

    if (call) {
      const result = await AITranscriptionService.evaluateCall(call.id);

      expect(result).toBeDefined();
      expect(result.transcriptTanglish).toContain('Vanakkam');
      expect(result.transcriptEnglish).toContain('Hello');
      expect(result.transcriptTamil).toContain('வணக்கம்');
      expect(result.qaScore).toBeGreaterThanOrEqual(70);
      expect(result.grade).toBe('A');
      expect(result.summary).toBeDefined();
    }
  });
});
