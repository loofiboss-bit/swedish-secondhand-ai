import { beforeEach, describe, expect, it, vi } from 'vitest';

const { desktopAnalyzeMock, getSettingsMock } = vi.hoisted(() => ({
  desktopAnalyzeMock: vi.fn(),
  getSettingsMock: vi.fn().mockResolvedValue({
    language: 'sv',
    currency: 'SEK',
    traderaAppId: 1234,
    aiMode: 'gemini',
    fallbackEnabled: true,
    onboardingCompleted: true,
    secretStatus: {
      geminiConfigured: true,
      traderaConfigured: false,
      encryptionAvailable: true,
      migrationStatus: 'not-needed',
    },
  }),
}));

vi.mock('@core/services/settingsService', () => ({
  settingsService: { getSettings: getSettingsMock },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn() },
}));

import { valuationService } from './valuationService';
import { listingTemplateService } from './listingTemplateService';
import { factsFromFingerprint } from './verifiedFactsService';

describe('valuation pipeline integration', () => {
  beforeEach(() => {
    window.desktop = {
      platform: 'linux',
      secrets: { getStatus: vi.fn(), update: vi.fn(), delete: vi.fn() },
      ai: { analyzeGemini: desktopAnalyzeMock, testGeminiConnection: vi.fn() },
      marketplace: { fetchTraderaComparables: vi.fn() },
    };
  });

  it('continues end to end through deterministic fallback after a transient AI failure', async () => {
    desktopAnalyzeMock.mockRejectedValueOnce(
      Object.assign(new Error('network unavailable'), { code: 'network' }),
    );

    const analysis = await valuationService.analyzeInput('IKEA Poang stol i bra skick', []);
    const fingerprint = analysis.fingerprint;
    const valuation = await valuationService.estimateValue(
      factsFromFingerprint(fingerprint),
      [
        {
          id: '1',
          source: 'tradera',
          site: 'tradera',
          title: 'IKEA Poang',
          priceSek: 350,
          soldAt: '2026-02-10T00:00:00.000Z',
          priceKind: 'realized',
          marketState: 'sold',
          conditionHint: 'good',
          url: '',
          similarityScore: 0.8,
          sourceQuality: 0.78,
          decision: { included: true, reason: 'Reviewed', decidedBy: 'user' },
        },
        {
          id: '2',
          source: 'manual',
          site: 'blocket',
          title: 'IKEA Poang Furniture chair',
          priceSek: 450,
          soldAt: '2026-02-11T00:00:00.000Z',
          priceKind: 'realized',
          marketState: 'sold',
          conditionHint: 'good',
          url: '',
          similarityScore: 0.7,
          sourceQuality: 0.6,
          decision: { included: true, reason: 'Reviewed', decidedBy: 'user' },
        },
      ],
      'balanced',
    );
    expect(valuation.status).not.toBe('insufficient-evidence');
    if (valuation.status === 'insufficient-evidence') throw new Error('Expected a price');
    const templates = listingTemplateService.generateTemplates(
      factsFromFingerprint(fingerprint),
      valuation,
    );

    expect(valuation.priceRecommendedSek).toBeGreaterThan(0);
    expect(valuation.pricingStrategy).toBe('balanced');
    expect(fingerprint).toMatchObject({ brand: 'IKEA', conditionGrade: 'good', confidence: 0.45 });
    expect(templates).toHaveLength(3);
  });
});
