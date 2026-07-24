import { describe, expect, it } from 'vitest';
import type { ComparableRecord, ItemFingerprint, PhotoAssessment } from '@core/types';
import { factsFromFingerprint, updateTestedStatus } from './verifiedFactsService';
import { evaluateCoach } from './coachEngine';

const fingerprint: ItemFingerprint = {
  title: 'Sony A6400',
  category: 'Electronics',
  brand: 'Sony',
  model: 'A6400',
  conditionGrade: 'good',
  attributes: {},
  detectedLanguage: 'sv',
  confidence: 0.8,
};

const goodPhoto: PhotoAssessment = {
  version: 1,
  imageIndex: 0,
  role: 'cover',
  width: 1200,
  height: 1200,
  brightness: 0.5,
  contrast: 0.4,
  sharpness: 0.4,
  perceptualHash: 'aaaaaaaaaaaaaaaa',
  cropRisk: false,
  issues: [],
  assessedAt: '2026-07-16T00:00:00Z',
};

const realized = (id: string): ComparableRecord => ({
  id,
  source: 'manual',
  site: 'tradera',
  title: 'Sony A6400',
  priceSek: 5000,
  soldAt: '2026-07-01T00:00:00Z',
  priceKind: 'realized',
  marketState: 'sold',
  conditionHint: 'good',
  url: '',
  similarityScore: 0.9,
  sourceQuality: 0.8,
  decision: { included: true, reason: 'Reviewed', decidedBy: 'user' },
});

describe('CoachEngine', () => {
  it('prioritizes safety and fact gaps before photos, evidence, price and listing', () => {
    const result = evaluateCoach({
      facts: factsFromFingerprint(fingerprint),
      photos: [],
      comparables: [],
      valuation: null,
      listings: [],
      projectStatus: 'draft',
    });
    expect(result.actions.map((action) => action.kind)).toEqual([
      'safety',
      'photos',
      'comparables',
      'price',
      'listing',
    ]);
    expect(result.actions.map((action) => action.priority)).toEqual([10, 30, 40, 50, 60]);
  });

  it('never counts asking prices or unreviewed realized prices as approved evidence', () => {
    const asking = { ...realized('asking'), priceKind: 'asking' as const };
    const unreviewed = { ...realized('unreviewed'), decision: undefined };
    const result = evaluateCoach({
      facts: updateTestedStatus(factsFromFingerprint(fingerprint), 'tested'),
      photos: [goodPhoto, { ...goodPhoto, imageIndex: 1, role: 'label_model' }],
      comparables: [asking, unreviewed],
      valuation: null,
      listings: [],
      projectStatus: 'draft',
    });
    expect(result.actions.some((action) => action.kind === 'comparables')).toBe(true);
  });

  it('removes the comparable action only after two user-approved realized observations', () => {
    const result = evaluateCoach({
      facts: updateTestedStatus(factsFromFingerprint(fingerprint), 'tested'),
      photos: [goodPhoto, { ...goodPhoto, imageIndex: 1, role: 'label_model' }],
      comparables: [realized('one'), realized('two')],
      valuation: null,
      listings: [],
      projectStatus: 'listed',
    });
    expect(result.actions.some((action) => action.kind === 'comparables')).toBe(false);
    expect(result.actions.at(-1)?.kind).toBe('follow-up');
  });
});
