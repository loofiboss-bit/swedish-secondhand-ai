import { create } from 'zustand';
import { DEFAULT_APP_SETTINGS, settingsService } from '@core/services/settingsService';
import type { AppSettings, SupportedLanguage } from '@core/types';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  setGeminiApiKey: (apiKey: string) => Promise<void>;
  setTraderaApiKey: (apiKey: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_APP_SETTINGS,
  isLoading: false,
  error: null,
  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsService.getSettings();
      set({ settings, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load settings',
      });
    }
  },
  setLanguage: async (language) => {
    const settings = await settingsService.updateSettings({ language });
    set({ settings });
  },
  setGeminiApiKey: async (apiKey) => {
    const settings = await settingsService.setGeminiApiKey(apiKey);
    set({ settings });
  },
  setTraderaApiKey: async (apiKey) => {
    const settings = await settingsService.setTraderaApiKey(apiKey);
    set({ settings });
  },
}));
