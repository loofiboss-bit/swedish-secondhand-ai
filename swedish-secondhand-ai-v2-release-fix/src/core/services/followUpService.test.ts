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
  it.each([
    ['2026-07-03T11:59:59Z', []],
    ['2026-07-04T12:00:00Z', [3]],
    ['2026-07-08T12:00:00Z', [3, 7]],
    ['2026-07-15T12:00:00Z', [3, 7, 14]],
  ] as const)('returns due advice at %s', (now, expected) => {
    expect(buildFollowUpActions(outcome, new Date(now)).map((action) => action.afterDays)).toEqual(
      expected,
    );
  });

  it('does not advise after a verified terminal outcome', () => {
    expect(
      buildFollowUpActions({ ...outcome, saleStatus: 'sold' }, new Date('2026-07-20')),
    ).toEqual([]);
  });
});
