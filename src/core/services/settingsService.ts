import { get, set } from 'idb-keyval';
import type { AppSecretStatus, AppSettings } from '@core/types';
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from '@core/ai/providers/ollama/OllamaConfig';
import { DEFAULT_GEMINI_MODEL } from '@core/ai/providers/gemini';
import { logger } from './loggerService';

const SETTINGS_KEY = 'swedish-secondhand-ai:settings';
const SETTINGS_SCHEMA_VERSION = 2;

interface LegacySecretFields {
  geminiApiKey?: string;
  traderaApiKey?: string;
}

type PersistedSettings = Partial<Omit<AppSettings, 'secretStatus'>> &
  LegacySecretFields & { schemaVersion?: number };

const DEFAULT_SECRET_STATUS: AppSecretStatus = {
  geminiConfigured: false,
  traderaConfigured: false,
  encryptionAvailable: false,
  migrationStatus: 'not-needed',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'sv',
  currency: 'SEK',
  traderaBaseUrl: 'https://api.tradera.com/v3',
  aiProvider: 'gemini',
  ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  secretStatus: DEFAULT_SECRET_STATUS,
};

function normalizeTrimmedValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function normalizePreferences(settings: PersistedSettings | undefined): AppSettings {
  return {
    language: settings?.language === 'en' ? 'en' : 'sv',
    currency: 'SEK',
    traderaBaseUrl: normalizeTrimmedValue(
      settings?.traderaBaseUrl,
      DEFAULT_APP_SETTINGS.traderaBaseUrl,
    ),
    aiProvider: settings?.aiProvider === 'ollama' ? 'ollama' : 'gemini',
    ollamaBaseUrl: normalizeTrimmedValue(settings?.ollamaBaseUrl, DEFAULT_OLLAMA_BASE_URL),
    ollamaModel: normalizeTrimmedValue(settings?.ollamaModel, DEFAULT_OLLAMA_MODEL),
    secretStatus: DEFAULT_SECRET_STATUS,
  };
}

function desktopBridge(): DesktopBridge | undefined {
  return typeof window === 'undefined' ? undefined : window.desktop;
}

function legacySecret(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function publicStatus(
  status: DesktopSecretStatus,
  migrationStatus: AppSecretStatus['migrationStatus'],
): AppSecretStatus {
  return {
    geminiConfigured: status.gemini.configured,
    traderaConfigured: status.tradera.configured,
    encryptionAvailable: status.encryptionAvailable,
    storageBackend: status.backend,
    migrationStatus,
  };
}

class SettingsService {
  private static instance: SettingsService;

  static getInstance(): SettingsService {
    if (!SettingsService.instance) SettingsService.instance = new SettingsService();
    return SettingsService.instance;
  }

  async getSettings(): Promise<AppSettings> {
    let persisted: PersistedSettings | undefined;
    try {
      persisted = await get<PersistedSettings>(SETTINGS_KEY);
    } catch (error) {
      logger.error('Failed to read settings', {
        errorCode: error instanceof Error && 'name' in error ? error.name : 'unknown',
      });
      return DEFAULT_APP_SETTINGS;
    }

    const preferences = normalizePreferences(persisted);
    const geminiLegacy = legacySecret(persisted?.geminiApiKey);
    const traderaLegacy = legacySecret(persisted?.traderaApiKey);
    const bridge = desktopBridge();
    if (!bridge) {
      return {
        ...preferences,
        secretStatus: {
          ...DEFAULT_SECRET_STATUS,
          migrationStatus: geminiLegacy || traderaLegacy ? 'pending' : 'not-needed',
        },
      };
    }

    try {
      let status = await bridge.secrets.getStatus();
      let migrationFailed = false;
      let changed = false;
      const migrated = { ...persisted };

      if (geminiLegacy) {
        try {
          status = await bridge.secrets.update('gemini', geminiLegacy);
          if (!status.gemini.configured) throw new Error('Gemini secret verification failed.');
          delete migrated.geminiApiKey;
          changed = true;
        } catch {
          migrationFailed = true;
        }
      }

      if (traderaLegacy) {
        try {
          status = await bridge.secrets.update('tradera', traderaLegacy);
          if (!status.tradera.configured) throw new Error('Tradera secret verification failed.');
          delete migrated.traderaApiKey;
          changed = true;
        } catch {
          migrationFailed = true;
        }
      }

      if (changed) {
        await set(SETTINGS_KEY, { ...migrated, schemaVersion: SETTINGS_SCHEMA_VERSION });
      }
      const hadLegacy = Boolean(geminiLegacy || traderaLegacy);
      const migrationStatus = migrationFailed ? 'failed' : hadLegacy ? 'completed' : 'not-needed';
      return { ...preferences, secretStatus: publicStatus(status, migrationStatus) };
    } catch (error) {
      logger.warn('Protected secret status is unavailable', {
        errorCode: error instanceof Error && 'code' in error ? String(error.code) : 'unknown',
      });
      return {
        ...preferences,
        secretStatus: {
          ...DEFAULT_SECRET_STATUS,
          migrationStatus: geminiLegacy || traderaLegacy ? 'failed' : 'not-needed',
        },
      };
    }
  }

  async updateSettings(partial: Partial<Omit<AppSettings, 'secretStatus'>>): Promise<AppSettings> {
    const persisted = (await get<PersistedSettings>(SETTINGS_KEY)) ?? {};
    const current = normalizePreferences(persisted);
    const next = normalizePreferences({ ...persisted, ...current, ...partial });
    await set(SETTINGS_KEY, {
      ...persisted,
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      language: next.language,
      currency: next.currency,
      traderaBaseUrl: next.traderaBaseUrl,
      aiProvider: next.aiProvider,
      ollamaBaseUrl: next.ollamaBaseUrl,
      ollamaModel: next.ollamaModel,
    });
    return this.getSettings();
  }

  async setSecret(secretId: DesktopSecretId, value: string): Promise<AppSettings> {
    const bridge = desktopBridge();
    if (!bridge) throw new Error('Secret configuration requires the desktop application.');
    const status = await bridge.secrets.update(secretId, value);
    const configured = secretId === 'gemini' ? status.gemini.configured : status.tradera.configured;
    if (!configured) throw new Error('Protected secret verification failed.');
    const persisted = (await get<PersistedSettings>(SETTINGS_KEY)) ?? {};
    if (secretId === 'gemini') delete persisted.geminiApiKey;
    else delete persisted.traderaApiKey;
    await set(SETTINGS_KEY, { ...persisted, schemaVersion: SETTINGS_SCHEMA_VERSION });
    return this.getSettings();
  }

  async deleteSecret(secretId: DesktopSecretId): Promise<AppSettings> {
    const bridge = desktopBridge();
    if (!bridge) throw new Error('Secret configuration requires the desktop application.');
    await bridge.secrets.delete(secretId);
    const persisted = (await get<PersistedSettings>(SETTINGS_KEY)) ?? {};
    if (secretId === 'gemini') delete persisted.geminiApiKey;
    else delete persisted.traderaApiKey;
    await set(SETTINGS_KEY, { ...persisted, schemaVersion: SETTINGS_SCHEMA_VERSION });
    return this.getSettings();
  }

  async setGeminiApiKey(apiKey: string): Promise<AppSettings> {
    return apiKey.trim() ? this.setSecret('gemini', apiKey) : this.deleteSecret('gemini');
  }

  async setTraderaApiKey(apiKey: string): Promise<AppSettings> {
    return apiKey.trim() ? this.setSecret('tradera', apiKey) : this.deleteSecret('tradera');
  }

  async testGeminiConnection(): Promise<boolean> {
    const bridge = desktopBridge();
    if (!bridge) throw new Error('Connection tests require the desktop application.');
    const result = await bridge.ai.testGeminiConnection(DEFAULT_GEMINI_MODEL);
    return result.connected;
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
