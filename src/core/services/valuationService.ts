import type {
  ComparableRecord,
  ItemFingerprint,
  PricingStrategy,
  ValuationResult,
  ValuationService,
} from '@core/types';
import { clamp } from '@core/utils/json';
import { itemAnalysisService } from './itemAnalysisService';

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[rank];
}

function fallbackFromCondition(condition: ItemFingerprint['conditionGrade']): number {
  const table: Record<ItemFingerprint['conditionGrade'], number> = {
    new: 900,
    like_new: 700,
    good: 500,
    fair: 320,
    poor: 180,
    unknown: 420,
  };
  return table[condition];
}

function strategyMultiplier(strategy: PricingStrategy): number {
  if (strategy === 'fast_sale') return 0.9;
  if (strategy === 'max_value') return 1.08;
  return 1;
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

function normalizeComparable(comp: ComparableRecord): number {
  const sourceQuality = clamp(comp.sourceQuality, 0, 1);
  const similarity = clamp(comp.similarityScore, 0, 1);
  const combined = (sourceQuality + similarity) / 2;
  return Math.max(1, comp.priceSek * (0.9 + combined * 0.2));
}

class ValuationServiceImpl implements ValuationService {
  private static instance: ValuationServiceImpl;

  static getInstance(): ValuationServiceImpl {
    if (!ValuationServiceImpl.instance) {
      ValuationServiceImpl.instance = new ValuationServiceImpl();
    }
    return ValuationServiceImpl.instance;
  }

  analyzeInput(text: string, images: string[]): Promise<ItemFingerprint> {
    return itemAnalysisService.analyzeInput(text, images);
  }

  async estimateValue(
    fingerprint: ItemFingerprint,
    comps: ComparableRecord[],
    strategy: PricingStrategy = 'balanced',
  ): Promise<ValuationResult> {
    const normalized = comps
      .map((item) => ({ item, normalizedPrice: normalizeComparable(item) }))
      .filter((entry) => entry.normalizedPrice > 0);

    const prices = normalized.map((entry) => entry.normalizedPrice);

    if (prices.length === 0) {
      const anchor = fallbackFromCondition(fingerprint.conditionGrade);
      const multiplier = strategyMultiplier(strategy);
      const recommended = Math.round(anchor * multiplier);
      return {
        priceMinSek: Math.round(recommended * 0.82),
        priceRecommendedSek: recommended,
        priceMaxSek: Math.round(recommended * 1.18),
        confidence: 0.25,
        rationale:
          'No API comparables were available. Recommendation is based on condition fallback only.',
        pricingStrategy: strategy,
        confidenceBreakdown: {
          similarity: 0,
          sampleSize: 0,
          sourceQuality: 0,
          calibration: 1,
        },
        compsUsed: [],
      };
    }

    const filteredPrices = filterOutliers(prices);
    const outliersRemoved = prices.length - filteredPrices.length;
    const q20 = percentile(filteredPrices, 0.2);
    const q50 = percentile(filteredPrices, 0.5);
    const q80 = percentile(filteredPrices, 0.8);

    const multiplier = strategyMultiplier(strategy);
    const priceMinSek = Math.round(q20 * multiplier);
    const priceRecommendedSek = Math.round(q50 * multiplier);
    const priceMaxSek = Math.round(Math.max(q80 * multiplier, priceRecommendedSek));

    const similarityAverage =
      normalized.reduce((sum, entry) => sum + clamp(entry.item.similarityScore, 0, 1), 0) /
      normalized.length;
    const sourceQualityAverage =
      normalized.reduce((sum, entry) => sum + clamp(entry.item.sourceQuality, 0, 1), 0) /
      normalized.length;
    const sampleSizeFactor = Math.min(normalized.length / 10, 1);

    const confidence = clamp(
      0.28 + similarityAverage * 0.33 + sourceQualityAverage * 0.22 + sampleSizeFactor * 0.2,
      0.2,
      0.95,
    );

    return {
      priceMinSek,
      priceRecommendedSek,
      priceMaxSek,
      confidence,
      rationale: `Computed from ${normalized.length} comparables (${outliersRemoved} outliers removed).`,
      pricingStrategy: strategy,
      confidenceBreakdown: {
        similarity: Number(similarityAverage.toFixed(2)),
        sampleSize: Number(sampleSizeFactor.toFixed(2)),
        sourceQuality: Number(sourceQualityAverage.toFixed(2)),
        calibration: 1,
      },
      compsUsed: comps.slice(0, 20),
    };
  }
}

export const valuationService = ValuationServiceImpl.getInstance();
