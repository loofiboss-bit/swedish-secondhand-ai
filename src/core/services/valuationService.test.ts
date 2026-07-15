import { describe, expect, it } from 'vitest';
import { rankComparables, valuationService } from './valuationService';
import { factsFromFingerprint } from './verifiedFactsService';

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
  it('returns no numeric price when evidence is missing', async () => {
    const result = await valuationService.estimateValue(factsFromFingerprint(fingerprint), []);

    expect(result).toMatchObject({
      status: 'insufficient-evidence',
      priceMinSek: null,
      priceRecommendedSek: null,
      priceMaxSek: null,
    });
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

    const facts = factsFromFingerprint(fingerprint);
    const fastSale = await valuationService.estimateValue(facts, comps, 'fast_sale');
    const balanced = await valuationService.estimateValue(facts, comps, 'balanced');
    const maxValue = await valuationService.estimateValue(facts, comps, 'max_value');

    expect(fastSale.status).not.toBe('insufficient-evidence');
    expect(balanced.status).not.toBe('insufficient-evidence');
    expect(maxValue.status).not.toBe('insufficient-evidence');
    if (
      fastSale.status === 'insufficient-evidence' ||
      balanced.status === 'insufficient-evidence' ||
      maxValue.status === 'insufficient-evidence'
    ) {
      throw new Error('Expected priced valuation');
    }
    expect(fastSale.priceRecommendedSek).toBeLessThan(balanced.priceRecommendedSek);
    expect(maxValue.priceRecommendedSek).toBeGreaterThan(balanced.priceRecommendedSek);
    expect(balanced.confidenceBreakdown.similarity).toBeGreaterThan(0);
  });

  it('preserves user exclusions and excludes them from the result', async () => {
    const facts = factsFromFingerprint(fingerprint);
    const comparables = [300, 400, 500, 9_000].map((priceSek, index) => ({
      id: `comp-${index}`,
      source: 'manual' as const,
      site: 'blocket' as const,
      title: 'IKEA Poang Chair Furniture',
      priceSek,
      soldAt: '2026-07-01T00:00:00.000Z',
      conditionHint: 'good',
      url: '',
      similarityScore: 0.9,
      sourceQuality: 0.9,
      decision:
        priceSek === 9_000
          ? { included: false, reason: 'Different edition', decidedBy: 'user' as const }
          : { included: true, reason: 'Reviewed match', decidedBy: 'user' as const },
    }));

    const ranked = rankComparables(facts, comparables);
    const result = await valuationService.estimateValue(facts, ranked);

    expect(ranked.find((item) => item.priceSek === 9_000)?.decision).toMatchObject({
      included: false,
      decidedBy: 'user',
    });
    expect(result.compsUsed.map((item) => item.priceSek)).not.toContain(9_000);
    expect(result.priceRecommendedSek).toBe(400);
  });

  it('shows condition and strategy adjustments without using them as an anchor', async () => {
    const facts = factsFromFingerprint({ ...fingerprint, conditionGrade: 'fair' });
    const comps = [400, 500, 600, 700].map((priceSek, index) => ({
      id: `adjustment-${index}`,
      source: 'manual' as const,
      site: 'blocket' as const,
      title: 'IKEA Poang Chair Furniture',
      priceSek,
      soldAt: '2026-07-01T00:00:00.000Z',
      conditionHint: 'unknown',
      url: '',
      similarityScore: 0.9,
      sourceQuality: 0.9,
      decision: { included: true, reason: 'Reviewed match', decidedBy: 'user' as const },
    }));

    const result = await valuationService.estimateValue(facts, comps, 'fast_sale');

    expect(result.status).toBe('ready');
    expect(result.adjustments.map((adjustment) => adjustment.id)).toEqual([
      'condition',
      'strategy',
    ]);
    expect(result.priceRecommendedSek).toBe(387);
  });
});
