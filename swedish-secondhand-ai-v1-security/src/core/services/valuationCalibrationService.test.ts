import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
}));

vi.mock('./historyService', () => ({
  historyService: {
    list: listMock,
  },
}));

import { valuationCalibrationService } from './valuationCalibrationService';

function soldEntry(category: string, brand: string, recommended: number, sold: number) {
  return {
    id: `${category}-${brand}-${recommended}`,
    createdAt: '2026-02-20T00:00:00.000Z',
    saleStatus: 'sold' as const,
    soldPriceSek: sold,
    fingerprint: {
      title: `${brand} ${category}`,
      category,
      brand,
      model: 'X',
      conditionGrade: 'good' as const,
      attributes: {},
      detectedLanguage: 'sv' as const,
      confidence: 0.7,
    },
    valuation: {
      priceMinSek: recommended - 100,
      priceRecommendedSek: recommended,
      priceMaxSek: recommended + 100,
      confidence: 0.6,
      rationale: 'test',
      pricingStrategy: 'balanced' as const,
      confidenceBreakdown: {
        similarity: 0.6,
        sampleSize: 0.5,
        sourceQuality: 0.7,
        calibration: 1,
      },
      compsUsed: [],
    },
    templates: [],
  };
}

describe('valuationCalibrationService', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('uses brand+category bucket when enough examples exist', async () => {
    listMock.mockResolvedValue([
      soldEntry('Furniture', 'IKEA', 1000, 960),
      soldEntry('Furniture', 'IKEA', 1200, 1150),
      soldEntry('Furniture', 'IKEA', 900, 910),
      soldEntry('Furniture', 'Other', 1000, 500),
    ]);

    const result = await valuationCalibrationService.recalculateConfidence(0.8, {
      category: 'Furniture',
      brand: 'IKEA',
    });

    expect(result.sampleSize).toBe(3);
    expect(result.summary).toContain('brand+category');
  });

  it('falls back to category bucket then global bucket', async () => {
    listMock.mockResolvedValue([
      soldEntry('Furniture', 'IKEA', 1000, 960),
      soldEntry('Furniture', 'JYSK', 1200, 1150),
      soldEntry('Furniture', 'Svenskt', 900, 910),
    ]);

    const categoryResult = await valuationCalibrationService.recalculateConfidence(0.8, {
      category: 'Furniture',
      brand: 'UnknownBrand',
    });
    expect(categoryResult.summary).toContain('category bucket');

    listMock.mockResolvedValue([
      soldEntry('Fashion', 'Nike', 500, 400),
      soldEntry('Fashion', 'H&M', 300, 250),
      soldEntry('Electronics', 'Sony', 2000, 1000),
    ]);

    const globalResult = await valuationCalibrationService.recalculateConfidence(0.8, {
      category: 'Furniture',
      brand: 'UnknownBrand',
    });
    expect(globalResult.summary).toContain('global bucket');
  });
});
