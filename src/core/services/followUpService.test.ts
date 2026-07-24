import { describe, expect, it } from 'vitest';
import type { ProjectOutcome } from '@core/types';
import { buildFollowUpActions } from './followUpService';

const outcome: ProjectOutcome = {
  saleStatus: 'pending',
  listedAt: '2026-07-01T12:00:00Z',
  marketplace: 'blocket',
  askingPriceSek: 500,
};

describe('followUpService', () => {
  it('returns every review path immediately for a pending publication', () => {
    expect(buildFollowUpActions(outcome).map((action) => action.kind)).toEqual([
      'photos',
      'price',
      'description',
    ]);
    expect(
      buildFollowUpActions({ ...outcome, listedAt: '2035-01-01T12:00:00Z' }).map(
        (action) => action.kind,
      ),
    ).toEqual(['photos', 'price', 'description']);
  });

  it('does not advise after a verified terminal outcome', () => {
    expect(buildFollowUpActions({ ...outcome, saleStatus: 'sold' })).toEqual([]);
  });

  it('does not advise before publication has been recorded', () => {
    expect(buildFollowUpActions({ saleStatus: 'pending' })).toEqual([]);
  });
});
