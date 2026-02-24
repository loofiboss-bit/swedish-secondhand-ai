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
  });

  it('computes range from comparables', async () => {
    const result = await valuationService.estimateValue(fingerprint, [
      {
        id: 'a',
        source: 'tradera',
        site: 'tradera',
        title: 'IKEA Poang Chair',
        priceSek: 300,
        soldAt: '2026-01-01T00:00:00.000Z',
        conditionHint: 'good',
        url: '',
        similarityScore: 0.8,
      },
      {
        id: 'b',
        source: 'manual',
        site: 'blocket',
        title: 'Poang armchair',
        priceSek: 500,
        soldAt: '2026-01-02T00:00:00.000Z',
        conditionHint: 'good',
        url: '',
        similarityScore: 0.6,
      },
      {
        id: 'c',
        source: 'manual',
        site: 'vinted',
        title: 'IKEA chair',
        priceSek: 450,
        soldAt: '2026-01-03T00:00:00.000Z',
        conditionHint: 'good',
        url: '',
        similarityScore: 0.7,
      },
    ]);

    expect(result.priceMinSek).toBeLessThanOrEqual(result.priceRecommendedSek);
    expect(result.priceMaxSek).toBeGreaterThanOrEqual(result.priceRecommendedSek);
    expect(result.confidence).toBeGreaterThan(0.3);
  });
});
