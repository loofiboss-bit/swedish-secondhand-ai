import type { ComparableRecord, ItemFingerprint } from '@core/types';

export interface ValuationBenchmark {
  id: string;
  fingerprint: ItemFingerprint;
  comparables: ComparableRecord[];
  expectedRecommendedSek: number;
}

function benchmark(
  id: string,
  category: string,
  title: string,
  brand: string,
  model: string,
  prices: number[],
  expectedRecommendedSek: number,
): ValuationBenchmark {
  const fingerprint: ItemFingerprint = {
    title,
    category,
    brand,
    model,
    conditionGrade: 'good',
    attributes: {},
    detectedLanguage: 'en',
    confidence: 0.85,
  };
  return {
    id,
    fingerprint,
    expectedRecommendedSek,
    comparables: prices.map((priceSek, index) => ({
      id: `${id}-${index + 1}`,
      source: 'manual',
      site: 'blocket',
      title: `${brand} ${model} ${title} ${category}`,
      priceSek,
      soldAt: `2026-06-0${index + 1}T12:00:00.000Z`,
      conditionHint: 'good',
      url: '',
      similarityScore: 0.9,
      sourceQuality: 0.85,
      decision: {
        included: true,
        reason: 'Approved benchmark fixture',
        decidedBy: 'user',
      },
    })),
  };
}

export const VALUATION_BENCHMARKS: ValuationBenchmark[] = [
  benchmark(
    'electronics-camera',
    'Electronics',
    'Mirrorless camera',
    'Sony',
    'A6000',
    [3_200, 3_400, 3_600, 3_800],
    3_600,
  ),
  benchmark(
    'fashion-jacket',
    'Fashion',
    'Outdoor jacket',
    'Fjallraven',
    'Keb',
    [300, 350, 400, 450],
    400,
  ),
  benchmark('furniture-chair', 'Furniture', 'Armchair', 'IKEA', 'Poang', [600, 700, 800, 900], 800),
  benchmark(
    'collectibles-figure',
    'Collectibles',
    'Collector figure',
    'Nintendo',
    'Mario',
    [1_000, 1_200, 1_400, 1_600],
    1_400,
  ),
  benchmark(
    'general-tool',
    'General',
    'Hand tool',
    'Bahco',
    'Adjustable',
    [100, 150, 200, 250],
    200,
  ),
];
