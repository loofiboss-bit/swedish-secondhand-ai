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

const valuation = {
  status: 'ready' as const,
  priceMinSek: 4_500,
  priceRecommendedSek: 5_000,
  priceMaxSek: 5_500,
  confidence: 0.8,
  rationale: 'Reviewed evidence',
  pricingStrategy: 'balanced' as const,
  confidenceBreakdown: {
    similarity: 0.8,
    sampleSize: 0.8,
    sourceQuality: 0.8,
    calibration: 1,
  },
  compsUsed: [],
  adjustments: [],
};

describe('CoachEngine', () => {
  it('prioritizes safety before price, listing, and optional improvements', () => {
    const result = evaluateCoach({
      facts: factsFromFingerprint(fingerprint),
      photos: [],
      comparables: [],
      valuation: null,
      listings: [],
      projectStatus: 'draft',
    });
    expect(result.readiness.nextAction).toMatchObject({ kind: 'safety', priority: 10 });
    expect(
      result.actions.filter((action) => action.severity === 'blocker').map((action) => action.kind),
    ).toEqual(['safety', 'price', 'listing']);
  });

  it('never counts asking prices or unreviewed realized prices as approved evidence', () => {
    const asking = { ...realized('asking'), priceKind: 'asking' as const };
    const unreviewed = { ...realized('unreviewed'), decision: undefined };
    const result = evaluateCoach({
      facts: updateTestedStatus(factsFromFingerprint(fingerprint), 'tested'),
      photos: [goodPhoto, { ...goodPhoto, imageIndex: 1, role: 'label_model' }],
      comparables: [asking, unreviewed],
      valuation,
      listings: [],
      priceDecision: { kind: 'evidence_based', valuation },
      projectStatus: 'draft',
    });
    expect(result.actions).toContainEqual(
      expect.objectContaining({ kind: 'comparables', severity: 'blocker' }),
    );
  });

  it('removes the comparable action only after two user-approved realized observations', () => {
    const result = evaluateCoach({
      facts: updateTestedStatus(factsFromFingerprint(fingerprint), 'tested'),
      photos: [goodPhoto, { ...goodPhoto, imageIndex: 1, role: 'label_model' }],
      comparables: [realized('one'), realized('two')],
      valuation,
      listings: [],
      priceDecision: { kind: 'evidence_based', valuation },
      projectStatus: 'listed',
    });
    expect(result.actions.some((action) => action.kind === 'comparables')).toBe(false);
    expect(result.actions.at(-1)?.kind).toBe('follow-up');
  });
});
