import { create } from 'zustand';
import { DEFAULT_APP_SETTINGS, settingsService } from '@core/services/settingsService';
import type { AppSettings, SupportedLanguage } from '@core/types';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  connectionState: 'idle' | 'testing' | 'connected' | 'failed';
  load: () => Promise<void>;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  setGeminiApiKey: (apiKey: string) => Promise<void>;
  setAiProvider: (aiProvider: NonNullable<AppSettings['aiProvider']>) => Promise<void>;
  setOllamaBaseUrl: (ollamaBaseUrl: string) => Promise<void>;
  setOllamaModel: (ollamaModel: string) => Promise<void>;
  setTraderaApiKey: (apiKey: string) => Promise<void>;
  testGeminiConnection: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => {
  const applyUpdate = async (operation: () => Promise<AppSettings>): Promise<void> => {
    set({ error: null });
    try {
      set({ settings: await operation() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Settings update failed' });
    }
  };

  return {
    settings: DEFAULT_APP_SETTINGS,
    isLoading: false,
    error: null,
    connectionState: 'idle',
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
    setLanguage: (language) => applyUpdate(() => settingsService.updateSettings({ language })),
    setGeminiApiKey: (apiKey) => applyUpdate(() => settingsService.setGeminiApiKey(apiKey)),
    setAiProvider: (aiProvider) => applyUpdate(() => settingsService.setAiProvider(aiProvider)),
    setOllamaBaseUrl: (ollamaBaseUrl) =>
      applyUpdate(() => settingsService.setOllamaBaseUrl(ollamaBaseUrl)),
    setOllamaModel: (ollamaModel) => applyUpdate(() => settingsService.setOllamaModel(ollamaModel)),
    setTraderaApiKey: (apiKey) => applyUpdate(() => settingsService.setTraderaApiKey(apiKey)),
    testGeminiConnection: async () => {
      set({ connectionState: 'testing', error: null });
      try {
        const connected = await settingsService.testGeminiConnection();
        set({ connectionState: connected ? 'connected' : 'failed' });
      } catch (error) {
        set({
          connectionState: 'failed',
          error: error instanceof Error ? error.message : 'Connection test failed',
        });
      }
    },
  };
});
