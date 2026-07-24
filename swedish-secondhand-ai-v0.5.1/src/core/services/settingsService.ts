import { get, set } from 'idb-keyval';
import type { AppSettings } from '@core/types';
import { logger } from './loggerService';

const SETTINGS_KEY = 'swedish-secondhand-ai:settings';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';
const DEFAULT_OLLAMA_MODEL = 'llava';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'sv',
  currency: 'SEK',
  geminiApiKey: '',
  traderaApiKey: '',
  traderaBaseUrl: 'https://api.tradera.com/v3',
  aiProvider: 'gemini',
  ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
};

function normalizeTrimmedValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function normalizeSettings(settings: Partial<AppSettings> | undefined): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...settings,
    geminiApiKey: settings?.geminiApiKey?.trim() ?? DEFAULT_APP_SETTINGS.geminiApiKey,
    traderaApiKey: settings?.traderaApiKey?.trim() ?? DEFAULT_APP_SETTINGS.traderaApiKey,
    aiProvider: settings?.aiProvider === 'ollama' ? 'ollama' : 'gemini',
    ollamaBaseUrl: normalizeTrimmedValue(settings?.ollamaBaseUrl, DEFAULT_OLLAMA_BASE_URL),
    ollamaModel: normalizeTrimmedValue(settings?.ollamaModel, DEFAULT_OLLAMA_MODEL),
  };
}

class SettingsService {
  private static instance: SettingsService;

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async getSettings(): Promise<AppSettings> {
    try {
      const stored = await get<AppSettings>(SETTINGS_KEY);
      return normalizeSettings(stored);
    } catch (error) {
      logger.error('Failed to read settings', error);
      return DEFAULT_APP_SETTINGS;
    }
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const next = normalizeSettings({ ...current, ...partial });
    await set(SETTINGS_KEY, next);
    return next;
  }

  async setGeminiApiKey(apiKey: string): Promise<AppSettings> {
    return this.updateSettings({ geminiApiKey: apiKey });
  }

  async setTraderaApiKey(apiKey: string): Promise<AppSettings> {
    return this.updateSettings({ traderaApiKey: apiKey });
  }

  async setAiProvider(aiProvider: NonNullable<AppSettings['aiProvider']>): Promise<AppSettings> {
    return this.updateSettings({ aiProvider });
  }

  async setOllamaBaseUrl(ollamaBaseUrl: string): Promise<AppSettings> {
    return this.updateSettings({ ollamaBaseUrl });
  }

  async setOllamaModel(ollamaModel: string): Promise<AppSettings> {
    return this.updateSettings({ ollamaModel });
  }
}

export const settingsService = SettingsService.getInstance();
