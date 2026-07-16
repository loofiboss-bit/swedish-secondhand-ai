import { projectRepository } from './projectRepository';
import { clamp } from '@core/utils/json';
import type { ItemFingerprint, PricingStrategy, VerifiedProjectOutcome } from '@core/types';

const MIN_CATEGORY_OUTCOMES = 5;

export interface CalibrationResult {
  adjustedConfidence: number;
  calibrationFactor: number;
  strategyFactor: number;
  sampleSize: number;
  basis: 'general-rule' | 'own-history';
  summary: string;
}

export interface CalibrationContext {
  category?: ItemFingerprint['category'];
  brand?: ItemFingerprint['brand'];
  pricingStrategy?: PricingStrategy;
}

class ValuationCalibrationService {
  private static instance: ValuationCalibrationService;

  static getInstance(): ValuationCalibrationService {
    if (!ValuationCalibrationService.instance) {
      ValuationCalibrationService.instance = new ValuationCalibrationService();
    }
    return ValuationCalibrationService.instance;
  }

  async recalculateConfidence(
    baseConfidence: number,
    context?: CalibrationContext,
  ): Promise<CalibrationResult> {
    let outcomes: VerifiedProjectOutcome[];
    try {
      outcomes = await projectRepository.listVerifiedOutcomes();
    } catch {
      outcomes = [];
    }
    const sameCategory = outcomes.filter((entry) => entry.category === context?.category);
    const sameBrandAndCategory = sameCategory.filter((entry) => entry.brand === context?.brand);
    const selected =
      sameBrandAndCategory.length >= MIN_CATEGORY_OUTCOMES
        ? sameBrandAndCategory
        : sameCategory.length >= MIN_CATEGORY_OUTCOMES
          ? sameCategory
          : [];

    if (selected.length < MIN_CATEGORY_OUTCOMES) {
      return {
        adjustedConfidence: clamp(baseConfidence, 0.2, 0.98),
        calibrationFactor: 1,
        strategyFactor: 1,
        sampleSize: sameCategory.length,
        basis: 'general-rule',
        summary: `Own-history calibration inactive: ${sameCategory.length}/${MIN_CATEGORY_OUTCOMES} verified category outcomes.`,
      };
    }

    const avgError =
      selected.reduce((sum, entry) => {
        const baseline = Math.max(entry.recommendedPriceSek, 1);
        return sum + Math.abs(entry.soldPriceSek - baseline) / baseline;
      }, 0) / selected.length;
    const calibrationFactor = clamp(1 - avgError, 0.6, 1.08);
    const adjustedConfidence = clamp(baseConfidence * (0.65 + calibrationFactor * 0.35), 0.2, 0.98);

    const strategyMatches = selected.filter(
      (entry) => entry.pricingStrategy === context?.pricingStrategy,
    );
    const strategySample =
      strategyMatches.length >= MIN_CATEGORY_OUTCOMES ? strategyMatches : selected;
    const averagePriceRatio =
      strategySample.reduce(
        (sum, entry) => sum + entry.soldPriceSek / Math.max(entry.recommendedPriceSek, 1),
        0,
      ) / strategySample.length;

    return {
      adjustedConfidence,
      calibrationFactor,
      strategyFactor: clamp(averagePriceRatio, 0.9, 1.1),
      sampleSize: selected.length,
      basis: 'own-history',
      summary: `Calibrated with ${selected.length} verified own outcomes in the category segment.`,
    };
  }
}

export const valuationCalibrationService = ValuationCalibrationService.getInstance();
