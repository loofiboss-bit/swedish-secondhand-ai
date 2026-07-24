import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VALUATION_BENCHMARKS } from './fixtures/valuationBenchmarks';
import { valuationService } from './valuationService';
import { factsFromFingerprint } from './verifiedFactsService';

describe('valuation benchmark regression fixtures', () => {
  beforeEach(() => vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z')));
  afterEach(() => vi.useRealTimers());

  it.each(VALUATION_BENCHMARKS)('$id remains deterministic', async (fixture) => {
    const first = await valuationService.estimateValue(
      factsFromFingerprint(fixture.fingerprint),
      fixture.comparables,
    );
    const second = await valuationService.estimateValue(
      factsFromFingerprint(fixture.fingerprint),
      fixture.comparables,
    );

    expect(first).toEqual(second);
    expect(first.status).toBe('ready');
    expect(first.priceRecommendedSek).toBe(fixture.expectedRecommendedSek);
    expect(first.compsUsed).toHaveLength(4);
  });
});
