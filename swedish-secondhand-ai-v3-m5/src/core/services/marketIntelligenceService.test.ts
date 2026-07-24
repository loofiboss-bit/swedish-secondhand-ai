import { describe, expect, it } from 'vitest';
import type { ComparableRecord, ItemFingerprint } from '@core/types';
import { factsFromFingerprint, updateProductAttribute } from './verifiedFactsService';
import {
  askingPriceRange,
  buildComparableQueryPlan,
  normalizeAndDedupeObservations,
  updateComparableQueryVariant,
} from './marketIntelligenceService';

const fingerprint: ItemFingerprint = {
  title: 'Sony Alpha A6400 kamera',
  category: 'Electronics',
  brand: 'Sony',
  model: 'A6400',
  conditionGrade: 'good',
  attributes: {},
  detectedLanguage: 'sv',
  confidence: 0.8,
};

function observation(overrides: Partial<ComparableRecord> = {}): ComparableRecord {
  return {
    id: '42',
    source: 'tradera',
    site: 'tradera',
    title: 'Sony A6400 kamerahus',
    priceSek: 6_000,
    soldAt: '2026-07-01T00:00:00Z',
    priceKind: 'asking',
    marketState: 'active',
    observedAt: '2026-07-16T00:00:00Z',
    conditionHint: 'good',
    url: 'https://www.tradera.com/item/42',
    similarityScore: 0.8,
    sourceQuality: 0.8,
    ...overrides,
  };
}

describe('marketIntelligenceService', () => {
  it('builds exact and broad searches from reviewed facts and preserves user edits', () => {
    const facts = updateProductAttribute(factsFromFingerprint(fingerprint), 'storage', 'Body only');
    const generated = buildComparableQueryPlan(facts, null, '2026-07-16T00:00:00Z');
    expect(generated.variants[0]).toMatchObject({ type: 'exact', query: 'Sony A6400 Body only' });
    expect(generated.variants.some((variant) => variant.type === 'broad')).toBe(true);

    const edited = updateComparableQueryVariant(generated, 'exact-primary', {
      query: 'Sony A6400 kamerahus',
    });
    const regenerated = buildComparableQueryPlan(facts, edited, '2026-07-16T01:00:00Z');
    expect(regenerated.variants[0]).toMatchObject({
      query: 'Sony A6400 kamerahus',
      userEdited: true,
    });
  });

  it('deduplicates observations across variants and retains exact provenance', () => {
    const result = normalizeAndDedupeObservations([
      observation({ hitType: 'broad', queryVariantIds: ['broad-model'], cacheAgeMs: 10_000 }),
      observation({ hitType: 'exact', queryVariantIds: ['exact-primary'], cacheAgeMs: 2_000 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      hitType: 'exact',
      queryVariantIds: ['broad-model', 'exact-primary'],
      cacheAgeMs: 2_000,
    });
  });

  it('keeps asking prices in a separate market-context interval', () => {
    expect(
      askingPriceRange([
        observation({ id: '1', priceSek: 4_000 }),
        observation({ id: '2', priceSek: 6_000 }),
        observation({ id: '3', priceSek: 9_000, priceKind: 'realized', marketState: 'sold' }),
      ]),
    ).toEqual({ count: 2, minSek: 4_000, medianSek: 5_000, maxSek: 6_000 });
  });
});
