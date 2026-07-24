import { create } from 'zustand';
import type {
  ComparableRecord,
  AnalysisKnowledgeGap,
  FactCandidate,
  ItemFingerprint,
  ListingDraft,
  PricingStrategy,
  ProductFactKey,
  ProductListFactKey,
  PhotoAssessment,
  PhotoRole,
  ValuationResult,
  VerifiedProductFacts,
  WorkflowStep,
} from '@core/types';
import { rankComparables, valuationService } from '@core/services/valuationService';
import { traderaAdapterService } from '@core/services/traderaAdapterService';
import { manualCompsService } from '@core/services/manualCompsService';
import { listingTemplateService } from '@core/services/listingTemplateService';
import { historyService } from '@core/services/historyService';
import { valuationCalibrationService } from '@core/services/valuationCalibrationService';
import {
  factsFromFingerprint,
  fingerprintFromFacts,
  mergeAnalyzedFacts,
  setProductFactLock,
  updateProductFact,
  updateProductListFact,
  updateProductAttribute,
  updateTestedStatus,
  updateAuthenticityStatus,
} from '@core/services/verifiedFactsService';
import { useListingStore } from './useListingStore';
import { useWorkflowStore } from './useWorkflowStore';

interface ValuationState {
  inputText: string;
  images: string[];
  pricingStrategy: PricingStrategy;
  fingerprint: ItemFingerprint | null;
  productFacts: VerifiedProductFacts | null;
  factCandidates: FactCandidate[];
  knowledgeGaps: AnalysisKnowledgeGap[];
  photoAssessments: PhotoAssessment[];
  traderaComps: ComparableRecord[];
  manualComps: ComparableRecord[];
  valuation: ValuationResult | null;
  loading: boolean;
  error: string | null;
  setInputText: (text: string) => void;
  setPricingStrategy: (strategy: PricingStrategy) => void;
  addImage: (dataUrl: string, assessment?: PhotoAssessment) => void;
  removeImage: (index: number) => void;
  setPhotoRole: (index: number, role: PhotoRole) => void;
  analyzeItem: () => Promise<void>;
  cancelAnalysis: () => void;
  fetchTraderaComparables: () => Promise<void>;
  loadManualComparables: () => Promise<void>;
  addManualComparable: (
    comp: Omit<ComparableRecord, 'id' | 'source' | 'sourceQuality'> &
      Partial<Pick<ComparableRecord, 'sourceQuality' | 'location' | 'shippingIncluded'>>,
  ) => Promise<void>;
  removeManualComparable: (id: string) => Promise<void>;
  setComparableIncluded: (id: string, included: boolean, reason?: string) => void;
  updateFact: (key: ProductFactKey, value: string) => void;
  updateListFact: (key: ProductListFactKey, value: string) => void;
  updateAttribute: (key: string, value: string) => void;
  setTestedStatus: (value: VerifiedProductFacts['testedStatus']['value']) => void;
  setAuthenticityStatus: (value: VerifiedProductFacts['authenticityStatus']['value']) => void;
  setFactLocked: (key: ProductFactKey, locked: boolean) => void;
  estimateValue: () => Promise<void>;
  runPipeline: () => Promise<void>;
  generateTemplates: () => void;
  saveToHistory: () => Promise<void>;
  hydrateFromDraft: (draft: ListingDraft) => void;
  buildDraft: (currentStep: WorkflowStep, completedSteps: WorkflowStep[]) => ListingDraft;
}

let activeAnalysis: AbortController | null = null;

export const useValuationStore = create<ValuationState>((set, get) => ({
  inputText: '',
  images: [],
  pricingStrategy: 'balanced',
  fingerprint: null,
  productFacts: null,
  factCandidates: [],
  knowledgeGaps: [],
  photoAssessments: [],
  traderaComps: [],
  manualComps: [],
  valuation: null,
  loading: false,
  error: null,
  setInputText: (inputText) => set({ inputText }),
  setPricingStrategy: (pricingStrategy) => set({ pricingStrategy }),
  addImage: (dataUrl, assessment) =>
    set((state) => {
      if (state.images.length >= 6) return state;
      const imageIndex = state.images.length;
      return {
        images: [...state.images, dataUrl],
        photoAssessments: assessment
          ? [...state.photoAssessments, { ...assessment, imageIndex }]
          : state.photoAssessments,
      };
    }),
  removeImage: (index) =>
    set((state) => ({
      images: state.images.filter((_, currentIndex) => currentIndex !== index),
      photoAssessments: state.photoAssessments
        .filter((assessment) => assessment.imageIndex !== index)
        .map((assessment) => ({
          ...assessment,
          imageIndex:
            assessment.imageIndex > index ? assessment.imageIndex - 1 : assessment.imageIndex,
          duplicateOfIndex:
            assessment.duplicateOfIndex === undefined || assessment.duplicateOfIndex === index
              ? undefined
              : assessment.duplicateOfIndex > index
                ? assessment.duplicateOfIndex - 1
                : assessment.duplicateOfIndex,
          issues:
            assessment.duplicateOfIndex === index
              ? assessment.issues.filter((issue) => issue !== 'duplicate')
              : assessment.issues,
        })),
    })),
  setPhotoRole: (index, role) =>
    set((state) => ({
      photoAssessments: state.photoAssessments.map((assessment) =>
        assessment.imageIndex === index ? { ...assessment, role } : assessment,
      ),
    })),
  analyzeItem: async () => {
    activeAnalysis?.abort();
    activeAnalysis = new AbortController();
    const controller = activeAnalysis;
    set({ loading: true, error: null });
    try {
      const state = get();
      if (!state.inputText.trim() && state.images.length === 0) {
        set({ loading: false, error: 'Add item text or at least one image before analysis.' });
        return;
      }

      const analysis = await valuationService.analyzeInput(
        state.inputText,
        state.images,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const productFacts = mergeAnalyzedFacts(state.productFacts, analysis.fingerprint);
      set({
        fingerprint: analysis.fingerprint,
        productFacts,
        factCandidates: analysis.candidates,
        knowledgeGaps: analysis.knowledgeGaps,
        loading: false,
      });
      useWorkflowStore.getState().markStepComplete('analyze');
    } catch (error) {
      if (controller.signal.aborted) {
        set({ loading: false, error: 'Analysis cancelled.' });
        return;
      }
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to analyze item',
      });
      useWorkflowStore.getState().setStepError('analyze', 'Analysis failed. Try again.');
    } finally {
      if (activeAnalysis === controller) activeAnalysis = null;
    }
  },
  cancelAnalysis: () => {
    activeAnalysis?.abort();
    activeAnalysis = null;
    set({ loading: false, error: 'Analysis cancelled.' });
  },
  fetchTraderaComparables: async () => {
    const { fingerprint, productFacts } = get();
    if (!fingerprint || !productFacts) {
      set({ error: 'Analyze item before fetching comparables.' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const traderaComps = await traderaAdapterService.getComparables({
        title: productFacts.title.value,
        category: productFacts.category.value,
        brand: productFacts.brand.value,
        model: productFacts.model.value,
        limit: 20,
      });
      set({ traderaComps: rankComparables(productFacts, traderaComps), loading: false });
      useWorkflowStore.getState().markStepComplete('comparables');
      useWorkflowStore.getState().setCurrentStep('price');
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Tradera comparables',
      });
      useWorkflowStore
        .getState()
        .setStepError('comparables', 'Unable to fetch Tradera comparables.');
    }
  },
  loadManualComparables: async () => {
    try {
      const manualComps = await manualCompsService.list();
      set({ manualComps });
    } catch {
      set({ error: 'Manual comparable data is corrupt or from an unsupported version.' });
    }
  },
  addManualComparable: async (comp) => {
    const next = await manualCompsService.add(comp);
    set((state) => ({
      manualComps: state.productFacts
        ? rankComparables(state.productFacts, [next, ...state.manualComps])
        : [next, ...state.manualComps],
    }));
  },
  removeManualComparable: async (id) => {
    const manualComps = await manualCompsService.remove(id);
    set({ manualComps });
  },
  setComparableIncluded: (id, included, reason) => {
    const update = (items: ComparableRecord[]) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              decision: {
                included,
                reason:
                  reason?.trim() ||
                  (included ? 'Included by user after review' : 'Excluded by user after review'),
                decidedBy: 'user' as const,
              },
            }
          : item,
      );
    set((state) => ({
      traderaComps: update(state.traderaComps),
      manualComps: update(state.manualComps),
      valuation: null,
    }));
  },
  updateFact: (key, value) => {
    const state = get();
    if (!state.productFacts) return;
    const productFacts = updateProductFact(state.productFacts, key, value);
    set({
      productFacts,
      traderaComps: rankComparables(productFacts, state.traderaComps),
      manualComps: rankComparables(productFacts, state.manualComps),
      valuation: null,
    });
  },
  updateListFact: (key, value) => {
    const state = get();
    if (!state.productFacts) return;
    set({ productFacts: updateProductListFact(state.productFacts, key, value), valuation: null });
  },
  updateAttribute: (key, value) => {
    const state = get();
    if (!state.productFacts) return;
    set({ productFacts: updateProductAttribute(state.productFacts, key, value), valuation: null });
  },
  setTestedStatus: (value) => {
    const productFacts = get().productFacts;
    if (!productFacts) return;
    set({ productFacts: updateTestedStatus(productFacts, value), valuation: null });
  },
  setAuthenticityStatus: (value) => {
    const productFacts = get().productFacts;
    if (!productFacts) return;
    set({ productFacts: updateAuthenticityStatus(productFacts, value), valuation: null });
  },
  setFactLocked: (key, locked) => {
    const productFacts = get().productFacts;
    if (!productFacts) return;
    set({ productFacts: setProductFactLock(productFacts, key, locked) });
  },
  estimateValue: async () => {
    const state = get();
    if (!state.fingerprint || !state.productFacts) {
      set({ error: 'Analyze item before valuation' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const baseValuation = await valuationService.estimateValue(
        state.productFacts,
        [...state.traderaComps, ...state.manualComps],
        state.pricingStrategy,
      );
      const calibration = await valuationCalibrationService.recalculateConfidence(
        baseValuation.confidence,
        {
          category: state.productFacts.category.value,
          brand: state.productFacts.brand.value,
        },
      );

      const valuation: ValuationResult = {
        ...baseValuation,
        confidence: calibration.adjustedConfidence,
        confidenceBreakdown: {
          ...baseValuation.confidenceBreakdown,
          calibration: Number(calibration.calibrationFactor.toFixed(2)),
        },
        rationale: `${baseValuation.rationale} ${calibration.summary}`,
      };

      set({ valuation, loading: false });
      useWorkflowStore.getState().markStepComplete('price');
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to estimate value',
      });
      useWorkflowStore.getState().setStepError('price', 'Estimation failed.');
    }
  },
  runPipeline: async () => {
    await get().analyzeItem();
    if (get().error) return;

    await get().fetchTraderaComparables();
    if (get().error) return;

    await get().estimateValue();
    if (get().error) return;

    try {
      get().generateTemplates();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to generate templates' });
      useWorkflowStore.getState().setStepError('templates', 'Template generation failed.');
    }
  },
  generateTemplates: () => {
    const state = get();
    if (!state.fingerprint || !state.productFacts || !state.valuation) {
      set({ error: 'Estimate value before generating templates.' });
      return;
    }
    if (state.valuation.status === 'insufficient-evidence') {
      set({ error: state.valuation.action });
      return;
    }
    const templates = listingTemplateService.generateTemplates(state.productFacts, state.valuation);
    useListingStore.getState().setTemplates(templates);
    useWorkflowStore.getState().markStepComplete('templates');
    useWorkflowStore.getState().setCurrentStep('review');
  },
  saveToHistory: async () => {
    const state = get();
    const listingStore = useListingStore.getState();
    const templates = listingStore.templates;
    if (!state.fingerprint || !state.productFacts || !state.valuation || templates.length === 0) {
      set({ error: 'Generate templates before saving history' });
      return;
    }
    if (listingStore.hasBlockingIssues()) {
      set({ error: 'Resolve template blocking issues before saving history.' });
      useWorkflowStore.getState().setStepError('review', 'Resolve blocking issues before saving.');
      return;
    }

    await historyService.add({
      fingerprint: fingerprintFromFacts(state.productFacts, state.fingerprint),
      valuation: state.valuation,
      templates,
    });
    useWorkflowStore.getState().markStepComplete('review');
  },
  hydrateFromDraft: (draft) => {
    set({
      inputText: draft.inputText,
      images: draft.images,
      pricingStrategy: draft.pricingStrategy,
      fingerprint: draft.fingerprint,
      productFacts:
        draft.productFacts ?? (draft.fingerprint ? factsFromFingerprint(draft.fingerprint) : null),
      factCandidates: draft.factCandidates ?? [],
      knowledgeGaps: draft.knowledgeGaps ?? [],
      photoAssessments: draft.photoAssessments ?? [],
      traderaComps: draft.traderaComps,
      manualComps: draft.manualComps,
      valuation: draft.valuation,
      error: null,
    });
  },
  buildDraft: (currentStep, completedSteps) => {
    const state = get();
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      currentStep,
      completedSteps,
      pricingStrategy: state.pricingStrategy,
      inputText: state.inputText,
      images: state.images,
      fingerprint: state.fingerprint,
      productFacts: state.productFacts,
      factCandidates: state.factCandidates,
      knowledgeGaps: state.knowledgeGaps,
      photoAssessments: state.photoAssessments,
      traderaComps: state.traderaComps,
      manualComps: state.manualComps,
      valuation: state.valuation,
      templates: useListingStore.getState().templates,
    };
  },
}));
