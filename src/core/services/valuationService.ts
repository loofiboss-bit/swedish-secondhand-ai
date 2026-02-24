import type {
  ComparableRecord,
  ItemFingerprint,
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
  ): Promise<ValuationResult> {
    const prices = comps.map((item) => item.priceSek).filter((price) => price > 0);

    if (prices.length === 0) {
      const anchor = fallbackFromCondition(fingerprint.conditionGrade);
      return {
        priceMinSek: Math.round(anchor * 0.8),
        priceRecommendedSek: anchor,
        priceMaxSek: Math.round(anchor * 1.2),
        confidence: 0.25,
        rationale:
          'No API comparables were available. Recommendation is based on condition fallback only.',
        compsUsed: [],
      };
    }

    const similarityAverage =
      comps.reduce((sum, item) => sum + clamp(item.similarityScore, 0, 1), 0) /
      Math.max(comps.length, 1);
    const q20 = percentile(prices, 0.2);
    const q50 = percentile(prices, 0.5);
    const q80 = percentile(prices, 0.8);

    const confidence = clamp(
      0.35 + similarityAverage * 0.4 + Math.min(comps.length, 10) * 0.04,
      0.2,
      0.95,
    );

    return {
      priceMinSek: Math.round(q20),
      priceRecommendedSek: Math.round(q50),
      priceMaxSek: Math.round(q80),
      confidence,
      rationale: `Computed from ${comps.length} comparables. Similarity average: ${similarityAverage.toFixed(2)}.`,
      compsUsed: comps.slice(0, 20),
    };
  }
}

export const valuationService = ValuationServiceImpl.getInstance();
