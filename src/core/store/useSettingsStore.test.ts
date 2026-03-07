import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSettingsMock,
  updateSettingsMock,
  setGeminiApiKeyMock,
  setAiProviderMock,
  setOllamaBaseUrlMock,
  setOllamaModelMock,
  setTraderaApiKeyMock,
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  setGeminiApiKeyMock: vi.fn(),
  setAiProviderMock: vi.fn(),
  setOllamaBaseUrlMock: vi.fn(),
  setOllamaModelMock: vi.fn(),
  setTraderaApiKeyMock: vi.fn(),
}));

vi.mock('@core/services/settingsService', () => ({
  DEFAULT_APP_SETTINGS: {
    language: 'sv',
    currency: 'SEK',
    geminiApiKey: '',
    traderaApiKey: '',
    traderaBaseUrl: 'https://api.tradera.com/v3',
    aiProvider: 'gemini',
    ollamaBaseUrl: 'http://localhost:11434/v1',
    ollamaModel: 'llava',
  },
  settingsService: {
    getSettings: getSettingsMock,
    updateSettings: updateSettingsMock,
    setGeminiApiKey: setGeminiApiKeyMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: 'abc',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
      ollamaBaseUrl: 'http://localhost:11434/v1',
      ollamaModel: 'llava',
    }),
    setAiProvider: setAiProviderMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434/v1',
      ollamaModel: 'llava',
    }),
    setOllamaBaseUrl: setOllamaBaseUrlMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11435/v1',
      ollamaModel: 'llava',
    }),
    setOllamaModel: setOllamaModelMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434/v1',
      ollamaModel: 'llama3.2-vision',
    }),
    setTraderaApiKey: setTraderaApiKeyMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: 'token',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
      ollamaBaseUrl: 'http://localhost:11434/v1',
      ollamaModel: 'llava',
    }),
  },
}));

import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
        language: 'sv',
        currency: 'SEK',
        geminiApiKey: '',
        traderaApiKey: '',
        traderaBaseUrl: 'https://api.tradera.com/v3',
        aiProvider: 'gemini',
        ollamaBaseUrl: 'http://localhost:11434/v1',
        ollamaModel: 'llava',
      },
      isLoading: false,
      error: null,
    });
  });

  it('loads settings from service', async () => {
    getSettingsMock.mockResolvedValue({
      language: 'en',
      currency: 'SEK',
      geminiApiKey: 'abc',
      traderaApiKey: 'def',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
      ollamaBaseUrl: 'http://localhost:11434/v1',
      ollamaModel: 'llava',
    });

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().settings.language).toBe('en');
  });

  it('updates language through service', async () => {
    updateSettingsMock.mockResolvedValue({
      language: 'en',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
      ollamaBaseUrl: 'http://localhost:11434/v1',
      ollamaModel: 'llava',
    });

    await useSettingsStore.getState().setLanguage('en');

    expect(useSettingsStore.getState().settings.language).toBe('en');
  });

  it('updates provider through service', async () => {
    await useSettingsStore.getState().setAiProvider('ollama');

    expect(setAiProviderMock).toHaveBeenCalledWith('ollama');
    expect(useSettingsStore.getState().settings.aiProvider).toBe('ollama');
  });

  it('updates ollama settings through service', async () => {
    await useSettingsStore.getState().setOllamaBaseUrl('http://localhost:11435/v1');
    await useSettingsStore.getState().setOllamaModel('llama3.2-vision');

    expect(setOllamaBaseUrlMock).toHaveBeenCalledWith('http://localhost:11435/v1');
    expect(setOllamaModelMock).toHaveBeenCalledWith('llama3.2-vision');
    expect(useSettingsStore.getState().settings.ollamaModel).toBe('llama3.2-vision');
  });
});
