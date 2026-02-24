import { describe, expect, it } from 'vitest';
import { valuationService } from './valuationService';
import { listingTemplateService } from './listingTemplateService';

describe('valuation pipeline integration', () => {
  it('analyzes, estimates, and generates templates end to end', async () => {
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
    expect(templates).toHaveLength(3);
  });
});
