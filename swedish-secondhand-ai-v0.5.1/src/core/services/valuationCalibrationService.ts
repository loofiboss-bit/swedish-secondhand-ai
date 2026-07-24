import { historyService } from './historyService';
import { clamp } from '@core/utils/json';
import type { ItemFingerprint } from '@core/types';

export interface CalibrationResult {
  adjustedConfidence: number;
  calibrationFactor: number;
  sampleSize: number;
  summary: string;
}

export interface CalibrationContext {
  category?: ItemFingerprint['category'];
  brand?: ItemFingerprint['brand'];
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
    const history = await historyService.list(250);
    const soldAll = history.filter(
      (entry) => entry.saleStatus === 'sold' && typeof entry.soldPriceSek === 'number',
    );

    const sameBrandAndCategory = soldAll.filter(
      (entry) =>
        entry.fingerprint.category === context?.category &&
        entry.fingerprint.brand === context?.brand,
    );
    const sameCategory = soldAll.filter(
      (entry) => entry.fingerprint.category === context?.category,
    );

    const sold =
      sameBrandAndCategory.length >= 3
        ? sameBrandAndCategory
        : sameCategory.length >= 3
          ? sameCategory
          : soldAll;

    if (sold.length < 3) {
      return {
        adjustedConfidence: clamp(baseConfidence, 0.2, 0.98),
        calibrationFactor: 1,
        sampleSize: sold.length,
        summary: 'Calibration unchanged: not enough sold outcomes yet.',
      };
    }

    const avgError =
      sold.reduce((sum, entry) => {
        const baseline = Math.max(entry.valuation.priceRecommendedSek, 1);
        const errorRatio = Math.abs((entry.soldPriceSek ?? baseline) - baseline) / baseline;
        return sum + errorRatio;
      }, 0) / sold.length;

    const calibrationFactor = clamp(1 - avgError, 0.6, 1.08);
    const adjustedConfidence = clamp(baseConfidence * (0.65 + calibrationFactor * 0.35), 0.2, 0.98);

    return {
      adjustedConfidence,
      calibrationFactor,
      sampleSize: sold.length,
      summary:
        sold === sameBrandAndCategory
          ? `Calibrated with ${sold.length} sold outcomes in brand+category bucket.`
          : sold === sameCategory
            ? `Calibrated with ${sold.length} sold outcomes in category bucket.`
            : `Calibrated with ${sold.length} sold outcomes in global bucket.`,
    };
  }
}

export const valuationCalibrationService = ValuationCalibrationService.getInstance();
