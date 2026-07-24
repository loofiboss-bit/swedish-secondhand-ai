import { describe, expect, it } from 'vitest';
import type { ItemFingerprint } from '@core/types';
import { factsFromFingerprint } from './verifiedFactsService';
import { createSellPlan } from './sellPlanService';

function facts(category: string) {
  const fingerprint: ItemFingerprint = {
    title: 'Item',
    category,
    brand: 'Brand',
    model: 'Model',
    conditionGrade: 'good',
    attributes: {},
    detectedLanguage: 'sv',
    confidence: 0.8,
  };
  return factsFromFingerprint(fingerprint);
}

describe('sellPlanService', () => {
  it.each([
    ['Fashion', 'balanced', 'vinted', 'fixed-price', 'shipping-or-pickup'],
    ['Furniture', 'fast', 'blocket', 'fixed-price', 'pickup'],
    ['Collectibles', 'patient', 'tradera', 'auction', 'shipping-or-pickup'],
  ] as const)(
    'maps %s with %s preference transparently',
    (category, timePreference, marketplace, saleFormat, fulfillment) => {
      const plan = createSellPlan(
        { facts: facts(category), comparables: [], valuation: null, timePreference },
        '2026-07-16T00:00:00Z',
      );
      expect(plan).toMatchObject({ marketplace, saleFormat, fulfillment });
      expect(plan.basis).toEqual(['general-rule']);
      expect(plan.rationale).toHaveLength(5);
    },
  );

  it('labels market data and only labels own history after the minimum sample', () => {
    const comparable = {
      id: 'one',
      source: 'manual' as const,
      site: 'tradera' as const,
      title: 'Item',
      priceSek: 500,
      soldAt: '2026-07-01T00:00:00Z',
      priceKind: 'realized' as const,
      marketState: 'sold' as const,
      url: '',
      conditionHint: 'good',
      similarityScore: 0.8,
      sourceQuality: 0.8,
      decision: { included: true, reason: 'Reviewed', decidedBy: 'user' as const },
    };
    expect(
      createSellPlan({
        facts: facts('Electronics'),
        comparables: [comparable],
        valuation: null,
        timePreference: 'balanced',
        ownHistorySampleSize: 4,
      }).basis,
    ).toEqual(['market-data', 'general-rule']);
  });
});
