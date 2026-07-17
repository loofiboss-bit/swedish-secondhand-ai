import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '@core/types';
import '@core/config/i18n';

const {
  setAppLanguageMock,
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
  setAppLanguageMock: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@core/config/i18n', async () => {
  const actual = await vi.importActual<typeof import('@core/config/i18n')>('@core/config/i18n');
  return { ...actual, setAppLanguage: setAppLanguageMock };
});

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

import { SettingsPanel } from './SettingsPanel';
import { useSettingsStore } from '@core/store/useSettingsStore';

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

describe('SettingsPanel', () => {
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
    setAiModeMock.mockImplementation(async (aiMode: 'gemini' | 'ollama' | 'offline') => ({
      ...baseSettings,
      aiMode,
    }));
    setFallbackEnabledMock.mockImplementation(async (fallbackEnabled: boolean) => ({
      ...baseSettings,
      fallbackEnabled,
    }));
    completeOnboardingMock.mockResolvedValue({ ...baseSettings, onboardingCompleted: true });
    setOllamaBaseUrlMock.mockImplementation(async (ollamaBaseUrl: string) => ({
      ...baseSettings,
      aiMode: 'ollama',
      ollamaBaseUrl,
    }));
    setOllamaModelMock.mockImplementation(async (ollamaModel: string) => ({
      ...baseSettings,
      aiMode: 'ollama',
      ollamaModel,
    }));
    setTraderaAppIdMock.mockImplementation(async (traderaAppId: number) => ({
      ...baseSettings,
      traderaAppId,
    }));
    setTraderaApiKeyMock.mockResolvedValue({
      ...baseSettings,
      secretStatus: { ...baseSettings.secretStatus, traderaConfigured: true },
    });
    testGeminiConnectionMock.mockResolvedValue(true);
    testOllamaConnectionMock.mockResolvedValue(true);
    testTraderaConnectionMock.mockResolvedValue(true);
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
    expect(
      screen.getByText(/Gemini API (?:key|nyckel).*configured|konfigurerad/i),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('AIza-updated');
  });

  it('persists provider and Ollama preferences', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    await user.selectOptions(screen.getByDisplayValue(/Gemini/), 'ollama');
    const baseUrl = screen.getByPlaceholderText('http://localhost:11434/v1');
    await user.clear(baseUrl);
    await user.type(baseUrl, 'http://localhost:11435/v1');
    await user.tab();
    const model = screen.getByPlaceholderText('llava');
    await user.clear(model);
    await user.type(model, 'llama3.2-vision');
    await user.tab();

    await waitFor(() => {
      expect(setAiModeMock).toHaveBeenCalledWith('ollama');
      expect(setOllamaBaseUrlMock).toHaveBeenCalledWith('http://localhost:11435/v1');
      expect(setOllamaModelMock).toHaveBeenCalledWith('llama3.2-vision');
    });
  });

  it('persists the public Tradera app ID separately from the protected app key', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    await user.click(screen.getByText(/tradera data \(optional\)|tradera-data \(valfritt\)/i));
    const appId = screen.getByRole('spinbutton', { name: /tradera app(?:-id| id)/i });
    await user.clear(appId);
    await user.type(appId, '4321');
    await user.tab();

    await waitFor(() => expect(setTraderaAppIdMock).toHaveBeenCalledWith(4321));
  });

  it('shows only settings for the selected AI mode', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('http://localhost:11434/v1')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByDisplayValue(/Gemini/), 'ollama');
    expect(await screen.findByPlaceholderText('http://localhost:11434/v1')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('AIza...')).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /test gemini|testa gemini/i }));

    await waitFor(() => expect(testGeminiConnectionMock).toHaveBeenCalledOnce());
    expect(
      await screen.findByText(/connection successful|anslutningen fungerar/i),
    ).toBeInTheDocument();
  });
});
