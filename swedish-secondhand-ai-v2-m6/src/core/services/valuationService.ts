import type {
  ComparableRecord,
  PricingStrategy,
  ValuationAdjustment,
  ValuationResult,
  ValuationService,
  VerifiedProductFacts,
} from '@core/types';
import { clamp } from '@core/utils/json';
import { itemAnalysisService } from './itemAnalysisService';

const MIN_RELEVANCE = 0.45;

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase('sv-SE')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 1),
  );
}

function overlap(left: string, right: string): number {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (leftTokens.size === 0) return 0;
  const matches = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return clamp(matches / leftTokens.size, 0, 1);
}

function includesFact(title: string, fact: string): number {
  const normalized = fact.trim().toLocaleLowerCase('sv-SE');
  if (!normalized || normalized === 'unknown') return 0.5;
  return title.toLocaleLowerCase('sv-SE').includes(normalized) ? 1 : 0;
}

function recencyScore(soldAt: string): number {
  const timestamp = Date.parse(soldAt);
  if (!Number.isFinite(timestamp)) return 0.35;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  return clamp(1 - ageDays / 730, 0.2, 1);
}

export function rankComparables(
  facts: VerifiedProductFacts,
  comparables: ComparableRecord[],
): ComparableRecord[] {
  return comparables
    .map((comparable) => {
      const factors = {
        title: overlap(facts.title.value, comparable.title),
        category: overlap(facts.category.value, comparable.title),
        brand: includesFact(comparable.title, facts.brand.value),
        model: includesFact(comparable.title, facts.model.value),
        recency: recencyScore(comparable.soldAt),
        sourceQuality: clamp(comparable.sourceQuality, 0, 1),
      };
      const score = clamp(
        factors.title * 0.3 +
          factors.category * 0.1 +
          factors.brand * 0.15 +
          factors.model * 0.2 +
          factors.recency * 0.1 +
          factors.sourceQuality * 0.15,
        0,
        1,
      );
      const weight = clamp(score * 0.7 + factors.sourceQuality * 0.3, 0.05, 1);
      const isRealized = comparable.priceKind === 'realized';
      const systemIncluded = isRealized && score >= MIN_RELEVANCE;
      const decision =
        isRealized && comparable.decision?.decidedBy === 'user'
          ? comparable.decision
          : {
              included: systemIncluded,
              reason: !isRealized
                ? 'Excluded: only verified realized prices can anchor the valuation'
                : systemIncluded
                  ? `Relevant match (${Math.round(score * 100)}%)`
                  : `Excluded: relevance ${Math.round(score * 100)}% is below ${Math.round(MIN_RELEVANCE * 100)}%`,
              decidedBy: 'system' as const,
            };

      return {
        ...comparable,
        relevance: {
          score: Number(score.toFixed(4)),
          weight: Number(weight.toFixed(4)),
          factors,
          reason: `Title ${Math.round(factors.title * 100)}%, brand ${Math.round(factors.brand * 100)}%, model ${Math.round(factors.model * 100)}%, recency ${Math.round(factors.recency * 100)}%`,
        },
        decision,
      };
    })
    .sort((left, right) => {
      const scoreDifference = (right.relevance?.score ?? 0) - (left.relevance?.score ?? 0);
      return scoreDifference || left.id.localeCompare(right.id);
    });
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[rank];
}

function filterOutliers(values: number[]): number[] {
  if (values.length < 6) return values;
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - iqr * 1.5;
  const upper = q3 + iqr * 1.5;
  const filtered = values.filter((price) => price >= lower && price <= upper);
  return filtered.length >= 3 ? filtered : values;
}

function weightedPercentile(
  entries: Array<{ price: number; weight: number }>,
  percentileTarget: number,
): number {
  const sorted = [...entries].sort((left, right) => left.price - right.price);
  const totalWeight = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  const threshold = totalWeight * percentileTarget;
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= threshold) return entry.price;
  }
  return sorted.at(-1)?.price ?? 0;
}

function strategyFactor(strategy: PricingStrategy): number {
  if (strategy === 'fast_sale') return 0.9;
  if (strategy === 'max_value') return 1.08;
  return 1;
}

function conditionFactor(condition: VerifiedProductFacts['conditionGrade']['value']): number {
  const factors = {
    new: 1.1,
    like_new: 1.05,
    good: 1,
    fair: 0.86,
    poor: 0.68,
    unknown: 0.92,
  } as const;
  return factors[condition];
}

function addAdjustment(
  adjustments: ValuationAdjustment[],
  id: string,
  label: string,
  factor: number,
  basePrice: number,
  reason: string,
): void {
  if (Math.abs(factor - 1) < 0.0001) return;
  adjustments.push({
    id,
    label,
    factor,
    amountSek: Math.round(basePrice * (factor - 1)),
    reason,
  });
}

function valuationAdjustments(
  facts: VerifiedProductFacts,
  strategy: PricingStrategy,
  basePrice: number,
): ValuationAdjustment[] {
  const adjustments: ValuationAdjustment[] = [];
  addAdjustment(
    adjustments,
    'condition',
    'Condition',
    conditionFactor(facts.conditionGrade.value),
    basePrice,
    `Verified condition: ${facts.conditionGrade.value}`,
  );
  addAdjustment(
    adjustments,
    'included-accessories',
    'Included accessories',
    1 + Math.min(facts.includedAccessories.value.length, 3) * 0.02,
    basePrice,
    `${facts.includedAccessories.value.length} verified accessories included`,
  );
  addAdjustment(
    adjustments,
    'missing-accessories',
    'Missing accessories',
    1 - Math.min(facts.missingAccessories.value.length, 4) * 0.05,
    basePrice,
    `${facts.missingAccessories.value.length} verified accessories missing`,
  );
  addAdjustment(
    adjustments,
    'defects',
    'Known defects',
    1 - Math.min(facts.defects.value.length, 5) * 0.06,
    basePrice,
    `${facts.defects.value.length} verified defects`,
  );
  addAdjustment(
    adjustments,
    'testing',
    'Testing status',
    facts.testedStatus.value === 'untested' ? 0.9 : 1,
    basePrice,
    'Item is explicitly untested',
  );
  addAdjustment(
    adjustments,
    'strategy',
    'Pricing strategy',
    strategyFactor(strategy),
    basePrice,
    `Selected strategy: ${strategy}`,
  );
  return adjustments;
}

function combinedFactor(adjustments: ValuationAdjustment[]): number {
  return adjustments.reduce((factor, adjustment) => factor * adjustment.factor, 1);
}

class ValuationServiceImpl implements ValuationService {
  private static instance: ValuationServiceImpl;

  static getInstance(): ValuationServiceImpl {
    if (!ValuationServiceImpl.instance) {
      ValuationServiceImpl.instance = new ValuationServiceImpl();
    }
    return ValuationServiceImpl.instance;
  }

  analyzeInput(text: string, images: string[], signal?: AbortSignal) {
    return itemAnalysisService.analyzeInput(text, images, signal);
  }

  async estimateValue(
    facts: VerifiedProductFacts,
    comps: ComparableRecord[],
    strategy: PricingStrategy = 'balanced',
  ): Promise<ValuationResult> {
    const ranked = rankComparables(facts, comps);
    const approved = ranked.filter(
      (item) =>
        item.decision?.included &&
        item.decision.decidedBy === 'user' &&
        item.priceKind === 'realized' &&
        Number.isFinite(item.priceSek) &&
        item.priceSek > 0 &&
        item.priceSek <= 10_000_000,
    );
    const similarityAverage =
      approved.reduce((sum, item) => sum + (item.relevance?.score ?? 0), 0) /
      Math.max(approved.length, 1);
    const sourceQualityAverage =
      approved.reduce((sum, item) => sum + clamp(item.sourceQuality, 0, 1), 0) /
      Math.max(approved.length, 1);
    const sampleSizeFactor = Math.min(approved.length / 8, 1);
    const confidence = clamp(
      similarityAverage * 0.45 + sourceQualityAverage * 0.3 + sampleSizeFactor * 0.25,
      0,
      0.95,
    );
    const confidenceBreakdown = {
      similarity: Number(similarityAverage.toFixed(2)),
      sampleSize: Number(sampleSizeFactor.toFixed(2)),
      sourceQuality: Number(sourceQualityAverage.toFixed(2)),
      calibration: 1,
    };

    if (approved.length < 2) {
      return {
        status: 'insufficient-evidence',
        priceMinSek: null,
        priceRecommendedSek: null,
        priceMaxSek: null,
        confidence,
        rationale: `Only ${approved.length} approved comparable is available; condition alone is not a price anchor.`,
        action:
          'Add or include at least two relevant comparables with verified realized prices before pricing.',
        pricingStrategy: strategy,
        confidenceBreakdown,
        compsUsed: approved,
        adjustments: [],
      };
    }

    const candidates = approved.map((item) => ({
      price: item.priceSek * (item.shippingIncluded ? 0.96 : 1),
      weight: item.relevance?.weight ?? 0.5,
    }));
    const filteredPrices = filterOutliers(candidates.map((entry) => entry.price));
    const normalized = candidates.filter((entry) => filteredPrices.includes(entry.price));
    const basePrice = weightedPercentile(normalized, 0.5);
    const adjustments = valuationAdjustments(facts, strategy, basePrice);
    const factor = combinedFactor(adjustments);
    const priceMinSek = Math.round(weightedPercentile(normalized, 0.2) * factor);
    const priceRecommendedSek = Math.round(basePrice * factor);
    const priceMaxSek = Math.max(
      priceRecommendedSek,
      Math.round(weightedPercentile(normalized, 0.8) * factor),
    );
    const common = {
      priceMinSek,
      priceRecommendedSek,
      priceMaxSek,
      confidence,
      rationale: `Computed deterministically from ${approved.length} approved comparables with ${adjustments.length} visible adjustments.`,
      pricingStrategy: strategy,
      confidenceBreakdown,
      compsUsed: approved,
      adjustments,
    };

    if (approved.length < 4 || confidence < 0.55) {
      return {
        status: 'low-confidence',
        ...common,
        action: 'Review relevance and add more sold comparables before publishing.',
      };
    }
    return { status: 'ready', ...common };
  }
}

export const valuationService = ValuationServiceImpl.getInstance();
