import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '@core/types';

const {
  getSettingsMock,
  updateSettingsMock,
  setGeminiApiKeyMock,
  setAiProviderMock,
  setOllamaBaseUrlMock,
  setOllamaModelMock,
  setTraderaApiKeyMock,
  testGeminiConnectionMock,
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  setGeminiApiKeyMock: vi.fn(),
  setAiProviderMock: vi.fn(),
  setOllamaBaseUrlMock: vi.fn(),
  setOllamaModelMock: vi.fn(),
  setTraderaApiKeyMock: vi.fn(),
  testGeminiConnectionMock: vi.fn(),
}));

const baseSettings: AppSettings = {
  language: 'sv',
  currency: 'SEK',
  traderaBaseUrl: 'https://api.tradera.com/v3',
  aiProvider: 'gemini',
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
    traderaBaseUrl: 'https://api.tradera.com/v3',
    aiProvider: 'gemini',
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
    setAiProvider: setAiProviderMock,
    setOllamaBaseUrl: setOllamaBaseUrlMock,
    setOllamaModel: setOllamaModelMock,
    setTraderaApiKey: setTraderaApiKeyMock,
    testGeminiConnection: testGeminiConnectionMock,
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
    });
    getSettingsMock.mockResolvedValue(baseSettings);
    updateSettingsMock.mockImplementation(async (partial) => ({ ...baseSettings, ...partial }));
    setGeminiApiKeyMock.mockResolvedValue({
      ...baseSettings,
      secretStatus: { ...baseSettings.secretStatus, geminiConfigured: true },
    });
    setAiProviderMock.mockResolvedValue({ ...baseSettings, aiProvider: 'ollama' });
    setOllamaBaseUrlMock.mockResolvedValue({
      ...baseSettings,
      ollamaBaseUrl: 'http://localhost:11435/v1',
    });
    setOllamaModelMock.mockResolvedValue({ ...baseSettings, ollamaModel: 'llama3.2-vision' });
    setTraderaApiKeyMock.mockResolvedValue({
      ...baseSettings,
      secretStatus: { ...baseSettings.secretStatus, traderaConfigured: true },
    });
    testGeminiConnectionMock.mockResolvedValue(true);
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
    await useSettingsStore.getState().setAiProvider('ollama');
    expect(setAiProviderMock).toHaveBeenCalledWith('ollama');
    expect(useSettingsStore.getState().settings.aiProvider).toBe('ollama');
  });

  it('updates Ollama preferences through service', async () => {
    await useSettingsStore.getState().setOllamaBaseUrl('http://localhost:11435/v1');
    await useSettingsStore.getState().setOllamaModel('llama3.2-vision');
    expect(setOllamaBaseUrlMock).toHaveBeenCalledWith('http://localhost:11435/v1');
    expect(setOllamaModelMock).toHaveBeenCalledWith('llama3.2-vision');
    expect(useSettingsStore.getState().settings.ollamaModel).toBe('llama3.2-vision');
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
    expect(useSettingsStore.getState().error).toBe('Protected OS storage is unavailable.');
    expect(JSON.stringify(useSettingsStore.getState())).not.toContain('super-secret');
  });

  it('reports Gemini connection state without exposing credentials', async () => {
    await useSettingsStore.getState().testGeminiConnection();

    expect(testGeminiConnectionMock).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState().connectionState).toBe('connected');
  });
});
