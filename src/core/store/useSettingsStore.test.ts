import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingsMock, updateSettingsMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
}));

vi.mock('@core/services/settingsService', () => ({
  DEFAULT_APP_SETTINGS: {
    language: 'sv',
    currency: 'SEK',
    geminiApiKey: '',
    traderaApiKey: '',
    traderaBaseUrl: 'https://api.tradera.com/v3',
  },
  settingsService: {
    getSettings: getSettingsMock,
    updateSettings: updateSettingsMock,
    setGeminiApiKey: vi.fn().mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: 'abc',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
    }),
    setTraderaApiKey: vi.fn().mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: 'token',
      traderaBaseUrl: 'https://api.tradera.com/v3',
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
    });

    await useSettingsStore.getState().setLanguage('en');

    expect(useSettingsStore.getState().settings.language).toBe('en');
  });
});
