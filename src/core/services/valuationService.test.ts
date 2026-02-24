import { describe, expect, it } from 'vitest';
import { valuationService } from './valuationService';

const fingerprint = {
  title: 'IKEA Poang Chair',
  category: 'Furniture',
  brand: 'IKEA',
  model: 'Poang',
  conditionGrade: 'good' as const,
  attributes: {},
  detectedLanguage: 'sv' as const,
  confidence: 0.8,
};

describe('valuationService', () => {
  it('returns fallback estimate when comps are missing', async () => {
    const result = await valuationService.estimateValue(fingerprint, []);

    expect(result.priceRecommendedSek).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.pricingStrategy).toBe('balanced');
  });

  it('computes range from comparables and supports strategies', async () => {
    const comps = [
      {
        id: 'a',
        source: 'tradera' as const,
        site: 'tradera' as const,
        title: 'IKEA Poang Chair',
        priceSek: 300,
        soldAt: '2026-01-01T00:00:00.000Z',
        conditionHint: 'good',
        url: '',
        similarityScore: 0.8,
        sourceQuality: 0.82,
      },
      {
        id: 'b',
        source: 'manual' as const,
        site: 'blocket' as const,
        title: 'Poang armchair',
        priceSek: 500,
        soldAt: '2026-01-02T00:00:00.000Z',
        conditionHint: 'good',
        url: '',
        similarityScore: 0.6,
        sourceQuality: 0.55,
      },
      {
        id: 'c',
        source: 'manual' as const,
        site: 'vinted' as const,
        title: 'IKEA chair',
        priceSek: 450,
        soldAt: '2026-01-03T00:00:00.000Z',
        conditionHint: 'good',
        url: '',
        similarityScore: 0.7,
        sourceQuality: 0.6,
      },
    ];

    const fastSale = await valuationService.estimateValue(fingerprint, comps, 'fast_sale');
    const balanced = await valuationService.estimateValue(fingerprint, comps, 'balanced');
    const maxValue = await valuationService.estimateValue(fingerprint, comps, 'max_value');

    expect(fastSale.priceRecommendedSek).toBeLessThan(balanced.priceRecommendedSek);
    expect(maxValue.priceRecommendedSek).toBeGreaterThan(balanced.priceRecommendedSek);
    expect(balanced.confidenceBreakdown.similarity).toBeGreaterThan(0);
  });
});
