import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '@core/types';
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
  testGeminiConnectionMock,
} = vi.hoisted(() => ({
  setAppLanguageMock: vi.fn().mockResolvedValue(undefined),
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  setGeminiApiKeyMock: vi.fn(),
  setAiProviderMock: vi.fn(),
  setOllamaBaseUrlMock: vi.fn(),
  setOllamaModelMock: vi.fn(),
  setTraderaApiKeyMock: vi.fn(),
  testGeminiConnectionMock: vi.fn(),
}));

vi.mock('@core/config/i18n', async () => {
  const actual = await vi.importActual<typeof import('@core/config/i18n')>('@core/config/i18n');
  return { ...actual, setAppLanguage: setAppLanguageMock };
});

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

import { SettingsPanel } from './SettingsPanel';
import { useSettingsStore } from '@core/store/useSettingsStore';

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

describe('SettingsPanel', () => {
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
    setAiProviderMock.mockImplementation(async (aiProvider: 'gemini' | 'ollama') => ({
      ...baseSettings,
      aiProvider,
    }));
    setOllamaBaseUrlMock.mockImplementation(async (ollamaBaseUrl: string) => ({
      ...baseSettings,
      ollamaBaseUrl,
    }));
    setOllamaModelMock.mockImplementation(async (ollamaModel: string) => ({
      ...baseSettings,
      ollamaModel,
    }));
    setTraderaApiKeyMock.mockResolvedValue({
      ...baseSettings,
      secretStatus: { ...baseSettings.secretStatus, traderaConfigured: true },
    });
    testGeminiConnectionMock.mockResolvedValue(true);
  });

  afterEach(cleanup);

  it('saves secret input on blur, clears it, and renders only configured status', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    const geminiInput = screen.getByPlaceholderText('AIza...');
    await user.type(geminiInput, 'AIza-updated');
    await user.tab();

    await waitFor(() => expect(setGeminiApiKeyMock).toHaveBeenCalledWith('AIza-updated'));
    await waitFor(() => expect(geminiInput).toHaveValue(''));
    expect(screen.getByText(/Gemini API-nyckel.*konfigurerad/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('AIza-updated');
  });

  it('persists provider and Ollama preferences', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    await user.selectOptions(screen.getByDisplayValue('Gemini'), 'ollama');
    const baseUrl = screen.getByPlaceholderText('http://localhost:11434/v1');
    await user.clear(baseUrl);
    await user.type(baseUrl, 'http://localhost:11435/v1');
    await user.tab();
    const model = screen.getByPlaceholderText('llava');
    await user.clear(model);
    await user.type(model, 'llama3.2-vision');
    await user.tab();

    await waitFor(() => {
      expect(setAiProviderMock).toHaveBeenCalledWith('ollama');
      expect(setOllamaBaseUrlMock).toHaveBeenCalledWith('http://localhost:11435/v1');
      expect(setOllamaModelMock).toHaveBeenCalledWith('llama3.2-vision');
    });
  });

  it('synchronizes non-secret inputs while keeping secret fields blank', () => {
    render(<SettingsPanel />);

    act(() => {
      useSettingsStore.setState({
        settings: {
          ...baseSettings,
          ollamaBaseUrl: 'http://localhost:22434/v1',
          ollamaModel: 'external-model',
          secretStatus: {
            ...baseSettings.secretStatus,
            geminiConfigured: true,
            traderaConfigured: true,
          },
        },
      });
    });

    expect(screen.getByPlaceholderText('http://localhost:11434/v1')).toHaveValue(
      'http://localhost:22434/v1',
    );
    expect(screen.getByPlaceholderText('llava')).toHaveValue('external-model');
    expect(screen.getAllByPlaceholderText(/Sparad säkert/i)).toHaveLength(2);
    expect(screen.getAllByPlaceholderText(/Sparad säkert/i)).toSatisfy((inputs: HTMLElement[]) =>
      inputs.every((input) => (input as HTMLInputElement).value === ''),
    );
  });

  it('tests a configured Gemini connection and renders public status only', async () => {
    const user = userEvent.setup();
    useSettingsStore.setState({
      settings: {
        ...baseSettings,
        secretStatus: { ...baseSettings.secretStatus, geminiConfigured: true },
      },
    });
    render(<SettingsPanel />);

    await user.click(screen.getByRole('button', { name: /testa anslutning/i }));

    await waitFor(() => expect(testGeminiConnectionMock).toHaveBeenCalledOnce());
    expect(await screen.findByText(/anslutningen fungerar/i)).toBeInTheDocument();
  });
});
