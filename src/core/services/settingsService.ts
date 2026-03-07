import { get, set } from 'idb-keyval';
import type { AppSettings } from '@core/types';
import { logger } from './loggerService';

const SETTINGS_KEY = 'swedish-secondhand-ai:settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'sv',
  currency: 'SEK',
  geminiApiKey: '',
  traderaApiKey: '',
  traderaBaseUrl: 'https://api.tradera.com/v3',
  aiProvider: 'gemini',
  ollamaBaseUrl: 'http://localhost:11434/v1',
  ollamaModel: 'llava',
};

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
      return { ...DEFAULT_APP_SETTINGS, ...stored };
    } catch (error) {
      logger.error('Failed to read settings', error);
      return DEFAULT_APP_SETTINGS;
    }
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...partial };
    await set(SETTINGS_KEY, next);
    return next;
  }

  async setGeminiApiKey(apiKey: string): Promise<AppSettings> {
    return this.updateSettings({ geminiApiKey: apiKey.trim() });
  }

  async setTraderaApiKey(apiKey: string): Promise<AppSettings> {
    return this.updateSettings({ traderaApiKey: apiKey.trim() });
  }
}

export const settingsService = SettingsService.getInstance();
