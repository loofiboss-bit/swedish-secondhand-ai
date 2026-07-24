import { create } from 'zustand';
import { DEFAULT_APP_SETTINGS, settingsService } from '@core/services/settingsService';
import { normalizeAppError } from '@core/services/appErrorService';
import type { AppErrorCode, AppSettings, SupportedLanguage } from '@core/types';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: AppErrorCode | null;
  connectionState: 'idle' | 'testing' | 'connected' | 'failed';
  ollamaConnectionState: 'idle' | 'testing' | 'connected' | 'failed';
  traderaConnectionState: 'idle' | 'testing' | 'connected' | 'failed';
  load: () => Promise<void>;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  setGeminiApiKey: (apiKey: string) => Promise<void>;
  setAiMode: (aiMode: AppSettings['aiMode']) => Promise<void>;
  setFallbackEnabled: (enabled: boolean) => Promise<void>;
  completeOnboarding: (
    language: SupportedLanguage,
    aiMode: AppSettings['aiMode'],
    fallbackEnabled: boolean,
  ) => Promise<void>;
  setOllamaBaseUrl: (ollamaBaseUrl: string) => Promise<void>;
  setOllamaModel: (ollamaModel: string) => Promise<void>;
  setTraderaApiKey: (apiKey: string) => Promise<void>;
  setTraderaAppId: (appId: number | undefined) => Promise<void>;
  testGeminiConnection: () => Promise<void>;
  testOllamaConnection: () => Promise<void>;
  testTraderaConnection: () => Promise<void>;
}

let settingsMutationRevision = 0;

export const useSettingsStore = create<SettingsState>((set) => {
  const applyUpdate = async (operation: () => Promise<AppSettings>): Promise<void> => {
    settingsMutationRevision += 1;
    set({ error: null });
    try {
      const settings = await operation();
      settingsMutationRevision += 1;
      set({ settings });
    } catch (error) {
      settingsMutationRevision += 1;
      set({ error: normalizeAppError(error, 'settings_operation_failed') });
    }
  };

  return {
    settings: DEFAULT_APP_SETTINGS,
    isLoading: true,
    error: null,
    connectionState: 'idle',
    ollamaConnectionState: 'idle',
    traderaConnectionState: 'idle',
    load: async () => {
      const loadRevision = settingsMutationRevision;
      set({ isLoading: true, error: null });
      try {
        const settings = await settingsService.getSettings();
        if (settingsMutationRevision === loadRevision) set({ settings, isLoading: false });
        else set({ isLoading: false });
      } catch (error) {
        set({
          isLoading: false,
          error: normalizeAppError(error, 'settings_operation_failed'),
        });
      }
    },
    setLanguage: (language) => applyUpdate(() => settingsService.updateSettings({ language })),
    setGeminiApiKey: (apiKey) => applyUpdate(() => settingsService.setGeminiApiKey(apiKey)),
    setAiMode: (aiMode) => applyUpdate(() => settingsService.setAiMode(aiMode)),
    setFallbackEnabled: (enabled) => applyUpdate(() => settingsService.setFallbackEnabled(enabled)),
    completeOnboarding: (language, aiMode, fallbackEnabled) =>
      applyUpdate(() => settingsService.completeOnboarding(language, aiMode, fallbackEnabled)),
    setOllamaBaseUrl: (ollamaBaseUrl) =>
      applyUpdate(() => settingsService.setOllamaBaseUrl(ollamaBaseUrl)),
    setOllamaModel: (ollamaModel) => applyUpdate(() => settingsService.setOllamaModel(ollamaModel)),
    setTraderaApiKey: (apiKey) => applyUpdate(() => settingsService.setTraderaApiKey(apiKey)),
    setTraderaAppId: (appId) => applyUpdate(() => settingsService.setTraderaAppId(appId)),
    testGeminiConnection: async () => {
      set({ connectionState: 'testing', error: null });
      try {
        const connected = await settingsService.testGeminiConnection();
        set({ connectionState: connected ? 'connected' : 'failed' });
      } catch (error) {
        set({
          connectionState: 'failed',
          error: normalizeAppError(error, 'provider_unavailable'),
        });
      }
    },
    testOllamaConnection: async () => {
      set({ ollamaConnectionState: 'testing', error: null });
      try {
        const connected = await settingsService.testOllamaConnection();
        set({ ollamaConnectionState: connected ? 'connected' : 'failed' });
      } catch {
        set({ ollamaConnectionState: 'failed' });
      }
    },
    testTraderaConnection: async () => {
      set({ traderaConnectionState: 'testing', error: null });
      try {
        const connected = await settingsService.testTraderaConnection();
        set({ traderaConnectionState: connected ? 'connected' : 'failed' });
      } catch {
        set({ traderaConnectionState: 'failed' });
      }
    },
  };
});
