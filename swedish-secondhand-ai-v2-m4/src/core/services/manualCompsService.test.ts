import { clear, set } from 'idb-keyval';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEnvelope, DATASET_KEYS } from './persistenceService';
import { manualCompsService } from './manualCompsService';

const base = {
  site: 'blocket' as const,
  title: 'Sony A6400',
  priceSek: 5_000,
  soldAt: '2026-07-10T12:00:00.000Z',
  priceKind: 'realized' as const,
  marketState: 'sold' as const,
  observedAt: '2026-07-16T12:00:00.000Z',
  conditionHint: 'good',
  url: 'https://www.blocket.se/example',
  hitType: 'manual' as const,
  queryVariantIds: [],
  similarityScore: 0.8,
};

describe('manualCompsService', () => {
  beforeEach(async () => clear());

  it('requires a safe optional source URL and preserves explicit price kind and date', async () => {
    await expect(manualCompsService.add({ ...base, url: 'javascript:alert(1)' })).rejects.toThrow(
      /HTTP or HTTPS/,
    );
    const saved = await manualCompsService.add(base);
    expect(saved).toMatchObject({
      priceKind: 'realized',
      marketState: 'sold',
      soldAt: '2026-07-10T12:00:00.000Z',
      hitType: 'manual',
    });
  });

  it('labels legacy observations as unknown instead of assuming they were sold', async () => {
    await set(
      DATASET_KEYS['manual-comparables'],
      createEnvelope('manual-comparables', [
        {
          ...base,
          id: 'legacy',
          source: 'manual',
          priceKind: undefined,
          marketState: undefined,
        },
      ]),
    );
    await expect(manualCompsService.list()).resolves.toEqual([
      expect.objectContaining({ priceKind: 'unknown', marketState: 'unknown' }),
    ]);
  });
});
