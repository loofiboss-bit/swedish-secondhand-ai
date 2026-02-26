import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ComparableRecord,
  ItemFingerprint,
  ListingTemplate,
  ValuationResult,
} from '@core/types';

const {
  analyzeInputMock,
  estimateValueMock,
  getComparablesMock,
  recalculateConfidenceMock,
  generateTemplatesMock,
} = vi.hoisted(() => ({
  analyzeInputMock: vi.fn(),
  estimateValueMock: vi.fn(),
  getComparablesMock: vi.fn(),
  recalculateConfidenceMock: vi.fn(),
  generateTemplatesMock: vi.fn(),
}));

vi.mock('@core/services/valuationService', () => ({
  valuationService: {
    analyzeInput: analyzeInputMock,
    estimateValue: estimateValueMock,
  },
}));

vi.mock('@core/services/traderaAdapterService', () => ({
  traderaAdapterService: {
    getComparables: getComparablesMock,
  },
}));

vi.mock('@core/services/valuationCalibrationService', () => ({
  valuationCalibrationService: {
    recalculateConfidence: recalculateConfidenceMock,
  },
}));

vi.mock('@core/services/listingTemplateService', () => ({
  listingTemplateService: {
    generateTemplates: generateTemplatesMock,
  },
}));

import { useListingStore } from './useListingStore';
import { useValuationStore } from './useValuationStore';
import { useWorkflowStore } from './useWorkflowStore';

const fingerprint: ItemFingerprint = {
  title: 'IKEA Poang Chair',
  category: 'Furniture',
  brand: 'IKEA',
  model: 'Poang',
  conditionGrade: 'good',
  attributes: {},
  detectedLanguage: 'sv',
  confidence: 0.86,
};

const comparables: ComparableRecord[] = [
  {
    id: 'comp-1',
    source: 'tradera',
    site: 'tradera',
    title: 'IKEA Poang',
    priceSek: 450,
    soldAt: '2026-02-11T00:00:00.000Z',
    conditionHint: 'good',
    url: 'https://example.test/item/1',
    similarityScore: 0.84,
    sourceQuality: 0.8,
  },
];

const valuation: ValuationResult = {
  priceMinSek: 350,
  priceRecommendedSek: 450,
  priceMaxSek: 550,
  confidence: 0.72,
  rationale: 'Comparable weighted median.',
  pricingStrategy: 'balanced',
  confidenceBreakdown: {
    similarity: 0.81,
    sampleSize: 0.65,
    sourceQuality: 0.75,
    calibration: 1,
  },
  compsUsed: comparables,
};

const templates: ListingTemplate[] = [
  {
    site: 'tradera',
    title: 'IKEA Poang fåtölj',
    description: 'Välskött fåtölj i bra skick.',
    priceSuggestionSek: 495,
    shippingSuggestion: 'Köparen hämtar',
    tags: ['ikea', 'poang'],
    disclaimer: 'Säljs i befintligt skick.',
  },
];

describe('useValuationStore runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useWorkflowStore.getState().resetWorkflow();
    useListingStore.getState().clear();

    useValuationStore.setState({
      inputText: '',
      images: [],
      pricingStrategy: 'balanced',
      fingerprint: null,
      traderaComps: [],
      manualComps: [],
      valuation: null,
      loading: false,
      error: null,
    });

    analyzeInputMock.mockResolvedValue(fingerprint);
    getComparablesMock.mockResolvedValue(comparables);
    estimateValueMock.mockResolvedValue(valuation);
    recalculateConfidenceMock.mockResolvedValue({
      adjustedConfidence: 0.79,
      calibrationFactor: 1.03,
      summary: 'Calibration applied.',
    });
    generateTemplatesMock.mockReturnValue(templates);
  });

  it('runs full pipeline and advances workflow to review on success', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(1);
    expect(estimateValueMock).toHaveBeenCalledTimes(1);
    expect(generateTemplatesMock).toHaveBeenCalledTimes(1);
    expect(useWorkflowStore.getState().currentStep).toBe('review');
    expect(useWorkflowStore.getState().completedSteps).toEqual(
      expect.arrayContaining(['analyze', 'comparables', 'price', 'templates']),
    );
    expect(useListingStore.getState().templates).toEqual(templates);
    expect(useValuationStore.getState().error).toBeNull();
  });

  it('short-circuits at analyze stage when required input is missing', async () => {
    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).not.toHaveBeenCalled();
    expect(getComparablesMock).not.toHaveBeenCalled();
    expect(estimateValueMock).not.toHaveBeenCalled();
    expect(generateTemplatesMock).not.toHaveBeenCalled();
    expect(useValuationStore.getState().error).toMatch(/add item text or at least one image/i);
    expect(useWorkflowStore.getState().currentStep).toBe('analyze');
  });

  it('short-circuits before estimate when comparables fetch fails', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    getComparablesMock.mockRejectedValueOnce(new Error('Tradera timeout'));

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(1);
    expect(estimateValueMock).not.toHaveBeenCalled();
    expect(generateTemplatesMock).not.toHaveBeenCalled();
    expect(useValuationStore.getState().error).toBe('Tradera timeout');
    expect(useWorkflowStore.getState().stepErrors.comparables).toBe(
      'Unable to fetch Tradera comparables.',
    );
  });

  it('short-circuits before template generation when estimate fails', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    estimateValueMock.mockRejectedValueOnce(new Error('Estimator down'));

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(1);
    expect(estimateValueMock).toHaveBeenCalledTimes(1);
    expect(generateTemplatesMock).not.toHaveBeenCalled();
    expect(useValuationStore.getState().error).toBe('Estimator down');
    expect(useWorkflowStore.getState().stepErrors.price).toBe('Estimation failed.');
    expect(useWorkflowStore.getState().currentStep).toBe('price');
  });

  it('sets template step error when template generation throws', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    generateTemplatesMock.mockImplementationOnce(() => {
      throw new Error('Template engine crashed');
    });

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(1);
    expect(estimateValueMock).toHaveBeenCalledTimes(1);
    expect(generateTemplatesMock).toHaveBeenCalledTimes(1);
    expect(useValuationStore.getState().error).toBe('Template engine crashed');
    expect(useWorkflowStore.getState().stepErrors.templates).toBe('Template generation failed.');
  });
});
