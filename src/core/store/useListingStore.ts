import { create } from 'zustand';
import type { ListingTemplate, MarketplaceSite } from '@core/types';

interface ListingState {
  templates: ListingTemplate[];
  selectedSite: MarketplaceSite | 'all';
  setTemplates: (templates: ListingTemplate[]) => void;
  setSelectedSite: (site: MarketplaceSite | 'all') => void;
  clear: () => void;
}

export const useListingStore = create<ListingState>((set) => ({
  templates: [],
  selectedSite: 'all',
  setTemplates: (templates) => set({ templates }),
  setSelectedSite: (selectedSite) => set({ selectedSite }),
  clear: () => set({ templates: [], selectedSite: 'all' }),
}));
