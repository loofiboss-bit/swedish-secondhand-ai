import { describe, expect, it, vi } from 'vitest';

const { generateContentMock, getSettingsMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  getSettingsMock: vi.fn().mockResolvedValue({
    language: 'sv',
    currency: 'SEK',
    geminiApiKey: 'configured-test-key',
    traderaApiKey: '',
    traderaBaseUrl: 'https://api.tradera.com/v3',
    aiProvider: 'gemini',
  }),
}));

vi.mock('@core/services/settingsService', () => ({
  settingsService: {
    getSettings: getSettingsMock,
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

import { valuationService } from './valuationService';
import { listingTemplateService } from './listingTemplateService';

describe('valuation pipeline integration', () => {
  it('continues end to end through deterministic fallback after a transient AI failure', async () => {
    generateContentMock.mockRejectedValueOnce(new TypeError('network unavailable'));

    const fingerprint = await valuationService.analyzeInput('IKEA Poang stol i bra skick', []);

    const valuation = await valuationService.estimateValue(
      fingerprint,
      [
        {
          id: '1',
          source: 'tradera',
          site: 'tradera',
          title: 'IKEA Poang',
          priceSek: 350,
          soldAt: '2026-02-10T00:00:00.000Z',
          conditionHint: 'good',
          url: '',
          similarityScore: 0.8,
          sourceQuality: 0.78,
        },
        {
          id: '2',
          source: 'manual',
          site: 'blocket',
          title: 'Poang armchair',
          priceSek: 450,
          soldAt: '2026-02-11T00:00:00.000Z',
          conditionHint: 'good',
          url: '',
          similarityScore: 0.7,
          sourceQuality: 0.6,
        },
      ],
      'balanced',
    );

    const templates = listingTemplateService.generateTemplates(fingerprint, valuation);

    expect(valuation.priceRecommendedSek).toBeGreaterThan(0);
    expect(valuation.pricingStrategy).toBe('balanced');
    expect(fingerprint).toMatchObject({ brand: 'IKEA', conditionGrade: 'good', confidence: 0.45 });
    expect(templates).toHaveLength(3);
  });
});
