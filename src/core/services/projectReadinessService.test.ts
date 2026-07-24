import { describe, expect, it } from 'vitest';
import type {
  ComparableRecord,
  ItemFingerprint,
  MarketplaceListingDraft,
  PricedValuationResult,
  PriceDecision,
} from '@core/types';
import { listingTemplateService } from './listingTemplateService';
import { evaluateProjectReadiness } from './projectReadinessService';
import { factsFromFingerprint, updateTestedStatus } from './verifiedFactsService';

const fingerprint: ItemFingerprint = {
  title: 'Sony A6400',
  category: 'Electronics',
  brand: 'Sony',
  model: 'A6400',
  conditionGrade: 'good',
  attributes: {},
  detectedLanguage: 'sv',
  confidence: 0.9,
};

const valuation: PricedValuationResult = {
  status: 'ready',
  priceMinSek: 4_500,
  priceRecommendedSek: 5_000,
  priceMaxSek: 5_500,
  confidence: 0.8,
  rationale: 'Two reviewed realized comparables.',
  pricingStrategy: 'balanced',
  confidenceBreakdown: {
    similarity: 0.8,
    sampleSize: 0.8,
    sourceQuality: 0.8,
    calibration: 1,
  },
  compsUsed: [],
  adjustments: [],
};

function realized(id: string): ComparableRecord {
  return {
    id,
    source: 'manual',
    site: 'tradera',
    title: 'Sony A6400',
    priceSek: 5_000,
    soldAt: '2026-07-01T00:00:00.000Z',
    priceKind: 'realized',
    marketState: 'sold',
    conditionHint: 'good',
    url: '',
    similarityScore: 0.9,
    sourceQuality: 0.8,
    decision: { included: true, reason: 'Reviewed', decidedBy: 'user' },
  };
}

function readyFacts() {
  return updateTestedStatus(factsFromFingerprint(fingerprint), 'tested');
}

function readyDrafts(priceDecision: PriceDecision = { kind: 'user_entered', amountSek: 5_000 }) {
  return listingTemplateService.generateListingDrafts(readyFacts(), priceDecision, 0);
}

function evaluate(overrides: Partial<Parameters<typeof evaluateProjectReadiness>[0]> = {}) {
  return evaluateProjectReadiness({
    facts: readyFacts(),
    photos: [],
    comparables: [],
    valuation: null,
    priceDecision: { kind: 'user_entered', amountSek: 5_000 },
    listingDrafts: readyDrafts(),
    selectedMarketplace: 'tradera',
    projectStatus: 'draft',
    ...overrides,
  });
}

describe('projectReadinessService', () => {
  it('completes the own-price path while keeping evidence work optional', () => {
    const readiness = evaluate();

    expect(readiness.complete).toBe(true);
    expect(readiness.copyEligible).toBe(true);
    expect(readiness.blockerCount).toBe(0);
    expect(readiness.issues.filter((issue) => issue.kind === 'comparables')).toEqual([
      expect.objectContaining({ severity: 'optional-research' }),
    ]);
    expect(
      readiness.issues.find((issue) => issue.kind === 'facts' && issue.severity === 'improvement'),
    ).toMatchObject({
      titleKey: 'coachFactsOptionalTitle',
      reasonKey: 'coachFactsOptionalReason',
    });
  });

  it('guides an unset price to a path choice instead of requiring market evidence', () => {
    const readiness = evaluate({
      priceDecision: { kind: 'unset' },
      listingDrafts: readyDrafts({ kind: 'unset' }),
    });

    expect(readiness.issues.filter((issue) => issue.id === 'price:decision-required')).toEqual([
      expect.objectContaining({
        titleKey: 'coachPriceDecisionTitle',
        reasonKey: 'coachPriceDecisionReason',
      }),
    ]);
    expect(readiness.issues.map((issue) => issue.id)).toHaveLength(
      new Set(readiness.issues.map((issue) => issue.id)).size,
    );
  });

  it('keeps approved realized evidence blocking only on the evidence-based path', () => {
    const blocked = evaluate({
      priceDecision: { kind: 'evidence_based', valuation },
      valuation,
      listingDrafts: readyDrafts({ kind: 'evidence_based', valuation }),
    });
    expect(blocked.stages.price.ready).toBe(false);
    expect(blocked.nextAction).toMatchObject({
      kind: 'comparables',
      severity: 'blocker',
    });

    const ready = evaluate({
      priceDecision: { kind: 'evidence_based', valuation },
      valuation,
      comparables: [realized('one'), realized('two')],
      listingDrafts: readyDrafts({ kind: 'evidence_based', valuation }),
    });
    expect(ready.stages.price.ready).toBe(true);
    expect(ready.complete).toBe(true);
  });

  it('does not mark a generated but incomplete selected listing as ready', () => {
    const [draft] = readyDrafts();
    const incomplete: MarketplaceListingDraft = {
      ...draft,
      fields: {
        ...draft.fields,
        category: { ...draft.fields.category, value: '' },
      },
    };

    const readiness = evaluate({ listingDrafts: [incomplete] });

    expect(readiness.stages.listing.ready).toBe(false);
    expect(readiness.copyEligible).toBe(false);
    expect(readiness.issues).toContainEqual(
      expect.objectContaining({
        id: 'listing:tradera:category-empty',
        severity: 'blocker',
      }),
    );
  });

  it('evaluates only the selected marketplace copy gate', () => {
    const drafts = readyDrafts();
    const brokenBlocket = drafts.map((draft) =>
      draft.site === 'blocket'
        ? {
            ...draft,
            fields: {
              ...draft.fields,
              category: { ...draft.fields.category, value: '' },
            },
          }
        : draft,
    );

    expect(
      evaluate({ listingDrafts: brokenBlocket, selectedMarketplace: 'tradera' }).complete,
    ).toBe(true);
    expect(
      evaluate({ listingDrafts: brokenBlocket, selectedMarketplace: 'blocket' }).complete,
    ).toBe(false);
  });
});
