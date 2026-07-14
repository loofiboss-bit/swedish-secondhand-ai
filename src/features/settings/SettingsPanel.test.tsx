import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@core/config/i18n';

const {
  setAppLanguageMock,
  getSettingsMock,
  updateSettingsMock,
  setGeminiApiKeyMock,
  setAiProviderMock,
  setOllamaBaseUrlMock,
  setOllamaModelMock,
  setTraderaApiKeyMock,
} = vi.hoisted(() => ({
  setAppLanguageMock: vi.fn().mockResolvedValue(undefined),
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  setGeminiApiKeyMock: vi.fn(),
  setAiProviderMock: vi.fn(),
  setOllamaBaseUrlMock: vi.fn(),
  setOllamaModelMock: vi.fn(),
  setTraderaApiKeyMock: vi.fn(),
}));

vi.mock('@core/config/i18n', async () => {
  const actual = await vi.importActual<typeof import('@core/config/i18n')>('@core/config/i18n');
  return {
    ...actual,
    setAppLanguage: setAppLanguageMock,
  };
});

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
    setGeminiApiKey: setGeminiApiKeyMock,
    setAiProvider: setAiProviderMock,
    setOllamaBaseUrl: setOllamaBaseUrlMock,
    setOllamaModel: setOllamaModelMock,
    setTraderaApiKey: setTraderaApiKeyMock,
  },
}));

import { SettingsPanel } from './SettingsPanel';
import { useSettingsStore } from '@core/store/useSettingsStore';

const baseSettings = {
  language: 'sv' as const,
  currency: 'SEK' as const,
  geminiApiKey: 'gemini-live-key',
  traderaApiKey: 'tradera-live-key',
  traderaBaseUrl: 'https://api.tradera.com/v3',
  aiProvider: 'gemini' as const,
  ollamaBaseUrl: 'http://localhost:11434/v1',
  ollamaModel: 'llava',
};

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      settings: baseSettings,
      isLoading: false,
      error: null,
    });

    getSettingsMock.mockResolvedValue(baseSettings);
    updateSettingsMock.mockImplementation(async (partial) => ({ ...baseSettings, ...partial }));
    setGeminiApiKeyMock.mockImplementation(async (geminiApiKey: string) => ({
      ...useSettingsStore.getState().settings,
      geminiApiKey,
    }));
    setAiProviderMock.mockImplementation(async (aiProvider: 'gemini' | 'ollama') => ({
      ...useSettingsStore.getState().settings,
      aiProvider,
    }));
    setOllamaBaseUrlMock.mockImplementation(async (ollamaBaseUrl: string) => ({
      ...useSettingsStore.getState().settings,
      aiProvider: 'ollama',
      ollamaBaseUrl,
    }));
    setOllamaModelMock.mockImplementation(async (ollamaModel: string) => ({
      ...useSettingsStore.getState().settings,
      aiProvider: 'ollama',
      ollamaModel,
    }));
    setTraderaApiKeyMock.mockImplementation(async (traderaApiKey: string) => ({
      ...useSettingsStore.getState().settings,
      traderaApiKey,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('persists settings fields on blur and reflects saved values', async () => {
    const user = userEvent.setup();

    render(<SettingsPanel />);

    const geminiInput = screen.getByPlaceholderText('AIza...');
    await user.clear(geminiInput);
    await user.type(geminiInput, 'AIza-updated');
    await user.tab();

    const ollamaBaseUrlInput = screen.getByPlaceholderText('http://localhost:11434/v1');
    await user.clear(ollamaBaseUrlInput);
    await user.type(ollamaBaseUrlInput, 'http://localhost:11435/v1');
    await user.tab();

    const ollamaModelInput = screen.getByPlaceholderText('llava');
    await user.clear(ollamaModelInput);
    await user.type(ollamaModelInput, 'llama3.2-vision');
    await user.tab();

    await waitFor(() => {
      expect(setGeminiApiKeyMock).toHaveBeenCalledWith('AIza-updated');
      expect(setOllamaBaseUrlMock).toHaveBeenCalledWith('http://localhost:11435/v1');
      expect(setOllamaModelMock).toHaveBeenCalledWith('llama3.2-vision');
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('AIza...')).toHaveValue('AIza-updated');
      expect(screen.getByPlaceholderText('http://localhost:11434/v1')).toHaveValue(
        'http://localhost:11435/v1',
      );
      expect(screen.getByPlaceholderText('llava')).toHaveValue('llama3.2-vision');
    });
  });

  it('switches between Gemini and Ollama providers', async () => {
    const user = userEvent.setup();

    render(<SettingsPanel />);

    const providerSelect = screen.getByDisplayValue('Gemini');
    expect(providerSelect).toHaveValue('gemini');

    await user.selectOptions(providerSelect, 'ollama');

    await waitFor(() => {
      expect(setAiProviderMock).toHaveBeenCalledWith('ollama');
      expect(providerSelect).toHaveValue('ollama');
    });
  });

  it('synchronizes inputs when settings change outside the form', () => {
    render(<SettingsPanel />);

    act(() => {
      useSettingsStore.setState({
        settings: {
          ...baseSettings,
          geminiApiKey: 'externally-loaded-key',
          ollamaBaseUrl: 'http://localhost:22434/v1',
          ollamaModel: 'external-model',
          traderaApiKey: 'externally-loaded-tradera-key',
        },
      });
    });

    expect(screen.getByPlaceholderText('AIza...')).toHaveValue('externally-loaded-key');
    expect(screen.getByPlaceholderText('http://localhost:11434/v1')).toHaveValue(
      'http://localhost:22434/v1',
    );
    expect(screen.getByPlaceholderText('llava')).toHaveValue('external-model');
    expect(screen.getByPlaceholderText('Tradera API key')).toHaveValue(
      'externally-loaded-tradera-key',
    );
  });
});
