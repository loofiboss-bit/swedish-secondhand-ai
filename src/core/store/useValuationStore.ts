import { create } from 'zustand';
import type { ComparableRecord, ItemFingerprint, ValuationResult } from '@core/types';
import { valuationService } from '@core/services/valuationService';
import { traderaAdapterService } from '@core/services/traderaAdapterService';
import { manualCompsService } from '@core/services/manualCompsService';
import { listingTemplateService } from '@core/services/listingTemplateService';
import { historyService } from '@core/services/historyService';
import { useListingStore } from './useListingStore';

interface ValuationState {
  inputText: string;
  images: string[];
  fingerprint: ItemFingerprint | null;
  traderaComps: ComparableRecord[];
  manualComps: ComparableRecord[];
  valuation: ValuationResult | null;
  loading: boolean;
  error: string | null;
  setInputText: (text: string) => void;
  addImage: (dataUrl: string) => void;
  removeImage: (index: number) => void;
  analyzeItem: () => Promise<void>;
  fetchTraderaComparables: () => Promise<void>;
  loadManualComparables: () => Promise<void>;
  addManualComparable: (comp: Omit<ComparableRecord, 'id' | 'source'>) => Promise<void>;
  removeManualComparable: (id: string) => Promise<void>;
  estimateValue: () => Promise<void>;
  generateTemplates: () => void;
  saveToHistory: () => Promise<void>;
}

export const useValuationStore = create<ValuationState>((set, get) => ({
  inputText: '',
  images: [],
  fingerprint: null,
  traderaComps: [],
  manualComps: [],
  valuation: null,
  loading: false,
  error: null,
  setInputText: (inputText) => set({ inputText }),
  addImage: (dataUrl) => set((state) => ({ images: [...state.images, dataUrl] })),
  removeImage: (index) =>
    set((state) => ({ images: state.images.filter((_, currentIndex) => currentIndex !== index) })),
  analyzeItem: async () => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const fingerprint = await valuationService.analyzeInput(state.inputText, state.images);
      set({ fingerprint, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to analyze item',
      });
    }
  },
  fetchTraderaComparables: async () => {
    const fingerprint = get().fingerprint;
    if (!fingerprint) return;
    set({ loading: true, error: null });
    try {
      const traderaComps = await traderaAdapterService.getComparables({
        title: fingerprint.title,
        category: fingerprint.category,
        brand: fingerprint.brand,
        model: fingerprint.model,
        limit: 20,
      });
      set({ traderaComps, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Tradera comparables',
      });
    }
  },
  loadManualComparables: async () => {
    const manualComps = await manualCompsService.list();
    set({ manualComps });
  },
  addManualComparable: async (comp) => {
    const next = await manualCompsService.add(comp);
    set((state) => ({ manualComps: [next, ...state.manualComps] }));
  },
  removeManualComparable: async (id) => {
    const manualComps = await manualCompsService.remove(id);
    set({ manualComps });
  },
  estimateValue: async () => {
    const state = get();
    if (!state.fingerprint) {
      set({ error: 'Analyze item before valuation' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const valuation = await valuationService.estimateValue(state.fingerprint, [
        ...state.traderaComps,
        ...state.manualComps,
      ]);
      set({ valuation, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to estimate value',
      });
    }
  },
  generateTemplates: () => {
    const state = get();
    if (!state.fingerprint || !state.valuation) return;
    const templates = listingTemplateService.generateTemplates(state.fingerprint, state.valuation);
    useListingStore.getState().setTemplates(templates);
  },
  saveToHistory: async () => {
    const state = get();
    const templates = useListingStore.getState().templates;
    if (!state.fingerprint || !state.valuation || templates.length === 0) {
      set({ error: 'Generate templates before saving history' });
      return;
    }

    await historyService.add({
      fingerprint: state.fingerprint,
      valuation: state.valuation,
      templates,
    });
  },
}));
