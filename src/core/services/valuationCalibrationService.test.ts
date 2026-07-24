import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listOutcomesMock } = vi.hoisted(() => ({ listOutcomesMock: vi.fn() }));

vi.mock('./projectRepository', () => ({
  projectRepository: { listVerifiedOutcomes: listOutcomesMock },
}));

import { valuationCalibrationService } from './valuationCalibrationService';

function outcome(category: string, brand: string, recommended: number, sold: number) {
  return {
    projectId: `${category}-${brand}-${recommended}`,
    category,
    brand,
    pricingStrategy: 'balanced' as const,
    recommendedPriceSek: recommended,
    soldPriceSek: sold,
    saleDurationDays: 7,
  };
}

describe('valuationCalibrationService', () => {
  beforeEach(() => listOutcomesMock.mockReset());

  it('keeps learning inactive below five verified outcomes in the same category', async () => {
    listOutcomesMock.mockResolvedValue(
      Array.from({ length: 4 }, (_, index) => outcome('Furniture', 'IKEA', 1_000, 950 + index)),
    );
    const result = await valuationCalibrationService.recalculateConfidence(0.8, {
      category: 'Furniture',
      brand: 'IKEA',
      pricingStrategy: 'balanced',
    });
    expect(result).toMatchObject({
      basis: 'general-rule',
      sampleSize: 4,
      calibrationFactor: 1,
      strategyFactor: 1,
    });
  });

  it('calibrates confidence and strategy only from the matching category segment', async () => {
    listOutcomesMock.mockResolvedValue([
      ...Array.from({ length: 5 }, (_, index) => outcome('Furniture', 'IKEA', 1_000, 900 + index)),
      ...Array.from({ length: 8 }, (_, index) => outcome('Fashion', 'Other', 1_000, 300 + index)),
    ]);
    const result = await valuationCalibrationService.recalculateConfidence(0.8, {
      category: 'Furniture',
      brand: 'IKEA',
      pricingStrategy: 'balanced',
    });
    expect(result.basis).toBe('own-history');
    expect(result.sampleSize).toBe(5);
    expect(result.strategyFactor).toBeGreaterThanOrEqual(0.9);
    expect(result.strategyFactor).toBeLessThan(1);
  });

  it('normalizes unknown category text into the General calibration segment', async () => {
    listOutcomesMock.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) =>
        outcome(index % 2 === 0 ? 'General' : 'Vintage wonder', 'Other', 1_000, 950),
      ),
    );

    const result = await valuationCalibrationService.recalculateConfidence(0.8, {
      category: 'Another unknown category',
      brand: 'Other',
      pricingStrategy: 'balanced',
    });

    expect(result).toMatchObject({ basis: 'own-history', sampleSize: 5 });
  });
});
