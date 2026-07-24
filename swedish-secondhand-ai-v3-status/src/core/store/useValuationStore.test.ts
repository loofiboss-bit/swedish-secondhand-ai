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
  generateListingDraftsMock,
} = vi.hoisted(() => ({
  analyzeInputMock: vi.fn(),
  estimateValueMock: vi.fn(),
  getComparablesMock: vi.fn(),
  recalculateConfidenceMock: vi.fn(),
  generateListingDraftsMock: vi.fn(),
}));

vi.mock('@core/services/valuationService', () => ({
  rankComparables: (_facts: unknown, items: unknown[]) => items,
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
    generateListingDrafts: generateListingDraftsMock,
    toTemplate: (draft: { site: string; fields: Record<string, { value: unknown }> }) => ({
      site: draft.site,
      title: draft.fields.title.value,
      description: draft.fields.description.value,
      priceSuggestionSek: draft.fields.priceSek.value,
      shippingSuggestion: draft.fields.shippingPickup.value,
      tags: draft.fields.tags.value,
      disclaimer: draft.fields.disclosure.value,
    }),
    exportStructuredCopyPackage: vi.fn(),
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
    priceKind: 'realized',
    marketState: 'sold',
    conditionHint: 'good',
    url: 'https://example.test/item/1',
    similarityScore: 0.84,
    sourceQuality: 0.8,
  },
];

const valuation: ValuationResult = {
  status: 'ready',
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
  adjustments: [],
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
      productFacts: null,
      traderaComps: [],
      manualComps: [],
      valuation: null,
      loading: false,
      error: null,
    });

    analyzeInputMock.mockResolvedValue({
      fingerprint,
      candidates: [],
      knowledgeGaps: [],
      mode: 'offline',
    });
    getComparablesMock.mockResolvedValue(comparables);
    estimateValueMock.mockResolvedValue(valuation);
    recalculateConfidenceMock.mockResolvedValue({
      adjustedConfidence: 0.79,
      calibrationFactor: 1.03,
      strategyFactor: 1,
      sampleSize: 0,
      basis: 'general-rule',
      summary: 'Calibration applied.',
    });
    generateListingDraftsMock.mockReturnValue(
      templates.map((template) => ({
        version: 1,
        site: template.site,
        updatedAt: '2026-07-16T00:00:00Z',
        fields: {
          title: { value: template.title, origin: 'generated', userEdited: false },
          description: { value: template.description, origin: 'generated', userEdited: false },
          priceSek: { value: template.priceSuggestionSek, origin: 'generated', userEdited: false },
          category: { value: 'Furniture', origin: 'generated', userEdited: false },
          attributes: { value: [], origin: 'generated', userEdited: false },
          shippingPickup: {
            value: template.shippingSuggestion,
            origin: 'generated',
            userEdited: false,
          },
          tags: { value: template.tags, origin: 'generated', userEdited: false },
          disclosure: { value: template.disclaimer, origin: 'generated', userEdited: false },
        },
        imageOrder: [],
        coverImageIndex: null,
      })),
    );
  });

  it('runs full pipeline and advances workflow to review on success', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(2);
    expect(estimateValueMock).toHaveBeenCalledTimes(1);
    expect(generateListingDraftsMock).toHaveBeenCalledTimes(1);
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
    expect(generateListingDraftsMock).not.toHaveBeenCalled();
    expect(useValuationStore.getState().error).toBe('analysis_input_required');
    expect(useWorkflowStore.getState().currentStep).toBe('analyze');
  });

  it('preserves the active input and images when provider analysis fails', async () => {
    useValuationStore.getState().setInputText('Sony camera in good condition');
    useValuationStore.getState().addImage('data:image/jpeg;base64,AAA');
    analyzeInputMock.mockRejectedValueOnce(new Error('Configured model was not found'));

    await useValuationStore.getState().analyzeItem();

    expect(useValuationStore.getState()).toMatchObject({
      inputText: 'Sony camera in good condition',
      images: ['data:image/jpeg;base64,AAA'],
      fingerprint: null,
      loading: false,
      error: 'analysis_failed',
    });
    expect(useWorkflowStore.getState().currentStep).toBe('analyze');
  });

  it('short-circuits before estimate when comparables fetch fails', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    getComparablesMock.mockRejectedValueOnce(new Error('Tradera timeout'));

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(2);
    expect(estimateValueMock).not.toHaveBeenCalled();
    expect(generateListingDraftsMock).not.toHaveBeenCalled();
    expect(useValuationStore.getState().error).toBe('comparables_failed');
    expect(useWorkflowStore.getState().stepErrors.comparables).toBe('comparables_failed');
  });

  it('short-circuits before template generation when estimate fails', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    estimateValueMock.mockRejectedValueOnce(new Error('Estimator down'));

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(2);
    expect(estimateValueMock).toHaveBeenCalledTimes(1);
    expect(generateListingDraftsMock).not.toHaveBeenCalled();
    expect(useValuationStore.getState().error).toBe('valuation_failed');
    expect(useWorkflowStore.getState().stepErrors.price).toBe('valuation_failed');
    expect(useWorkflowStore.getState().currentStep).toBe('price');
  });

  it('sets template step error when template generation throws', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    generateListingDraftsMock.mockImplementationOnce(() => {
      throw new Error('Template engine crashed');
    });

    await useValuationStore.getState().runPipeline();

    expect(analyzeInputMock).toHaveBeenCalledTimes(1);
    expect(getComparablesMock).toHaveBeenCalledTimes(2);
    expect(estimateValueMock).toHaveBeenCalledTimes(1);
    expect(generateListingDraftsMock).toHaveBeenCalledTimes(1);
    expect(useValuationStore.getState().error).toBe('listing_failed');
    expect(useWorkflowStore.getState().stepErrors.templates).toBe('listing_failed');
  });

  it('builds all three deterministic price scenarios from the same reviewed evidence', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    await useValuationStore.getState().analyzeItem();
    estimateValueMock.mockClear();

    await useValuationStore.getState().compareScenarios();

    expect(estimateValueMock).toHaveBeenCalledTimes(3);
    expect(estimateValueMock.mock.calls.map((call) => call[2])).toEqual([
      'fast_sale',
      'balanced',
      'max_value',
    ]);
    expect(
      useValuationStore.getState().valuationScenarios.map((scenario) => scenario.strategy),
    ).toEqual(['fast_sale', 'balanced', 'max_value']);
  });

  it('applies a visible strategy adjustment only when local learning reports enough outcomes', async () => {
    useValuationStore.getState().setInputText('IKEA Poang armchair in good condition');
    await useValuationStore.getState().analyzeItem();
    useValuationStore.setState({ traderaComps: comparables });
    recalculateConfidenceMock.mockResolvedValueOnce({
      adjustedConfidence: 0.75,
      calibrationFactor: 0.9,
      strategyFactor: 0.9,
      sampleSize: 5,
      basis: 'own-history',
      summary: 'Calibrated from own category outcomes.',
    });

    await useValuationStore.getState().estimateValue();

    expect(useValuationStore.getState().valuation).toMatchObject({
      priceRecommendedSek: 405,
      adjustments: [
        expect.objectContaining({ id: 'own-history-strategy', factor: 0.9, amountSek: -45 }),
      ],
    });
    expect(useValuationStore.getState().localLearningSampleSize).toBe(5);
  });
});
