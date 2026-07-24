import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '@core/types';

const {
  getSettingsMock,
  updateSettingsMock,
  setGeminiApiKeyMock,
  setAiModeMock,
  setFallbackEnabledMock,
  completeOnboardingMock,
  setOllamaBaseUrlMock,
  setOllamaModelMock,
  setTraderaAppIdMock,
  setTraderaApiKeyMock,
  testGeminiConnectionMock,
  testOllamaConnectionMock,
  testTraderaConnectionMock,
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  setGeminiApiKeyMock: vi.fn(),
  setAiModeMock: vi.fn(),
  setFallbackEnabledMock: vi.fn(),
  completeOnboardingMock: vi.fn(),
  setOllamaBaseUrlMock: vi.fn(),
  setOllamaModelMock: vi.fn(),
  setTraderaAppIdMock: vi.fn(),
  setTraderaApiKeyMock: vi.fn(),
  testGeminiConnectionMock: vi.fn(),
  testOllamaConnectionMock: vi.fn(),
  testTraderaConnectionMock: vi.fn(),
}));

const baseSettings: AppSettings = {
  language: 'sv',
  currency: 'SEK',
  traderaAppId: 1234,
  aiMode: 'gemini',
  fallbackEnabled: false,
  onboardingCompleted: true,
  ollamaBaseUrl: 'http://localhost:11434/v1',
  ollamaModel: 'llava',
  secretStatus: {
    geminiConfigured: false,
    traderaConfigured: false,
    encryptionAvailable: true,
    storageBackend: 'kwallet6',
    migrationStatus: 'not-needed',
  },
};

vi.mock('@core/services/settingsService', () => ({
  DEFAULT_APP_SETTINGS: {
    language: 'sv',
    currency: 'SEK',
    traderaAppId: 1234,
    aiMode: 'offline',
    fallbackEnabled: false,
    onboardingCompleted: false,
    ollamaBaseUrl: 'http://localhost:11434/v1',
    ollamaModel: 'llava',
    secretStatus: {
      geminiConfigured: false,
      traderaConfigured: false,
      encryptionAvailable: true,
      migrationStatus: 'not-needed',
    },
  },
  settingsService: {
    getSettings: getSettingsMock,
    updateSettings: updateSettingsMock,
    setGeminiApiKey: setGeminiApiKeyMock,
    setAiMode: setAiModeMock,
    setFallbackEnabled: setFallbackEnabledMock,
    completeOnboarding: completeOnboardingMock,
    setOllamaBaseUrl: setOllamaBaseUrlMock,
    setOllamaModel: setOllamaModelMock,
    setTraderaAppId: setTraderaAppIdMock,
    setTraderaApiKey: setTraderaApiKeyMock,
    testGeminiConnection: testGeminiConnectionMock,
    testOllamaConnection: testOllamaConnectionMock,
    testTraderaConnection: testTraderaConnectionMock,
  },
}));

import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      settings: baseSettings,
      isLoading: false,
      error: null,
      connectionState: 'idle',
      ollamaConnectionState: 'idle',
      traderaConnectionState: 'idle',
    });
    getSettingsMock.mockResolvedValue(baseSettings);
    updateSettingsMock.mockImplementation(async (partial) => ({ ...baseSettings, ...partial }));
    setGeminiApiKeyMock.mockResolvedValue({
      ...baseSettings,
      secretStatus: { ...baseSettings.secretStatus, geminiConfigured: true },
    });
    setAiModeMock.mockResolvedValue({ ...baseSettings, aiMode: 'ollama' });
    setFallbackEnabledMock.mockResolvedValue({ ...baseSettings, fallbackEnabled: true });
    completeOnboardingMock.mockResolvedValue({ ...baseSettings, onboardingCompleted: true });
    setOllamaBaseUrlMock.mockResolvedValue({
      ...baseSettings,
      ollamaBaseUrl: 'http://localhost:11435/v1',
    });
    setOllamaModelMock.mockResolvedValue({ ...baseSettings, ollamaModel: 'llama3.2-vision' });
    setTraderaAppIdMock.mockResolvedValue({ ...baseSettings, traderaAppId: 4321 });
    setTraderaApiKeyMock.mockResolvedValue({
      ...baseSettings,
      secretStatus: { ...baseSettings.secretStatus, traderaConfigured: true },
    });
    testGeminiConnectionMock.mockResolvedValue(true);
    testOllamaConnectionMock.mockResolvedValue(true);
    testTraderaConnectionMock.mockResolvedValue(false);
  });

  it('loads provider preferences and non-sensitive secret status', async () => {
    getSettingsMock.mockResolvedValue({
      ...baseSettings,
      language: 'en',
      secretStatus: {
        ...baseSettings.secretStatus,
        geminiConfigured: true,
        traderaConfigured: true,
      },
    });

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().settings.language).toBe('en');
    expect(useSettingsStore.getState().settings.secretStatus.geminiConfigured).toBe(true);
    expect(useSettingsStore.getState().settings).not.toHaveProperty('geminiApiKey');
    expect(useSettingsStore.getState().settings).not.toHaveProperty('traderaApiKey');
  });

  it('updates language through service', async () => {
    await useSettingsStore.getState().setLanguage('en');
    expect(useSettingsStore.getState().settings.language).toBe('en');
  });

  it('updates provider through service', async () => {
    await useSettingsStore.getState().setAiMode('ollama');
    expect(setAiModeMock).toHaveBeenCalledWith('ollama');
    expect(useSettingsStore.getState().settings.aiMode).toBe('ollama');
  });

  it('does not let an older load overwrite a completed first-run update', async () => {
    let resolveLoad: ((settings: AppSettings) => void) | undefined;
    getSettingsMock.mockReturnValueOnce(
      new Promise<AppSettings>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const loading = useSettingsStore.getState().load();
    await useSettingsStore.getState().completeOnboarding('sv', 'offline', false);
    resolveLoad?.({ ...baseSettings, onboardingCompleted: false });
    await loading;

    expect(useSettingsStore.getState().settings.onboardingCompleted).toBe(true);
  });

  it('updates Ollama preferences through service', async () => {
    await useSettingsStore.getState().setOllamaBaseUrl('http://localhost:11435/v1');
    await useSettingsStore.getState().setOllamaModel('llama3.2-vision');
    expect(setOllamaBaseUrlMock).toHaveBeenCalledWith('http://localhost:11435/v1');
    expect(setOllamaModelMock).toHaveBeenCalledWith('llama3.2-vision');
    expect(useSettingsStore.getState().settings.ollamaModel).toBe('llama3.2-vision');
  });

  it('updates the public Tradera app ID through service', async () => {
    await useSettingsStore.getState().setTraderaAppId(4321);
    expect(setTraderaAppIdMock).toHaveBeenCalledWith(4321);
    expect(useSettingsStore.getState().settings.traderaAppId).toBe(4321);
  });

  it('passes a key directly to protected storage and retains only configured status', async () => {
    await useSettingsStore.getState().setGeminiApiKey('super-secret');
    expect(setGeminiApiKeyMock).toHaveBeenCalledWith('super-secret');
    expect(useSettingsStore.getState().settings.secretStatus.geminiConfigured).toBe(true);
    expect(JSON.stringify(useSettingsStore.getState())).not.toContain('super-secret');
  });

  it('keeps existing settings and exposes only a normalized update error', async () => {
    setGeminiApiKeyMock.mockRejectedValueOnce(new Error('Protected OS storage is unavailable.'));

    await useSettingsStore.getState().setGeminiApiKey('super-secret');

    expect(useSettingsStore.getState().settings).toEqual(baseSettings);
    expect(useSettingsStore.getState().error).toBe('settings_operation_failed');
    expect(JSON.stringify(useSettingsStore.getState())).not.toContain('super-secret');
  });

  it('reports Gemini connection state without exposing credentials', async () => {
    await useSettingsStore.getState().testGeminiConnection();

    expect(testGeminiConnectionMock).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().connectionState).toBe('connected');
  });

  it('reports localized-provider connection states independently', async () => {
    await useSettingsStore.getState().testOllamaConnection();
    await useSettingsStore.getState().testTraderaConnection();

    expect(testOllamaConnectionMock).toHaveBeenCalledOnce();
    expect(testTraderaConnectionMock).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().ollamaConnectionState).toBe('connected');
    expect(useSettingsStore.getState().traderaConnectionState).toBe('failed');
  });
});
