import type { AppSecretStatus, AppSettings } from '@core/types';
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from '@core/ai/providers/ollama/OllamaConfig';
import { DEFAULT_GEMINI_MODEL } from '@core/ai/providers/gemini';
import { OllamaProvider } from '@core/ai/providers/ollama';
import { getDesktopBridge } from '@core/platform/desktopBridge';
import { logger } from './loggerService';
import { readVersionedDataset, writeVersionedDataset } from './persistenceService';

interface LegacySecretFields {
  geminiApiKey?: string;
  traderaApiKey?: string;
  traderaBaseUrl?: string;
  aiProvider?: 'gemini' | 'ollama';
}

export type PersistedSettings = Partial<Omit<AppSettings, 'secretStatus'>> & LegacySecretFields;

export function isPersistedSettings(value: unknown): value is PersistedSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  return (
    (settings.language === undefined || settings.language === 'sv' || settings.language === 'en') &&
    (settings.currency === undefined || settings.currency === 'SEK') &&
    (settings.traderaBaseUrl === undefined || typeof settings.traderaBaseUrl === 'string') &&
    (settings.traderaAppId === undefined ||
      (typeof settings.traderaAppId === 'number' &&
        Number.isSafeInteger(settings.traderaAppId) &&
        settings.traderaAppId > 0)) &&
    (settings.aiProvider === undefined ||
      settings.aiProvider === 'gemini' ||
      settings.aiProvider === 'ollama') &&
    (settings.aiMode === undefined ||
      settings.aiMode === 'gemini' ||
      settings.aiMode === 'ollama' ||
      settings.aiMode === 'offline') &&
    (settings.fallbackEnabled === undefined || typeof settings.fallbackEnabled === 'boolean') &&
    (settings.onboardingCompleted === undefined ||
      typeof settings.onboardingCompleted === 'boolean') &&
    (settings.ollamaBaseUrl === undefined || typeof settings.ollamaBaseUrl === 'string') &&
    (settings.ollamaModel === undefined || typeof settings.ollamaModel === 'string') &&
    (settings.geminiApiKey === undefined || typeof settings.geminiApiKey === 'string') &&
    (settings.traderaApiKey === undefined || typeof settings.traderaApiKey === 'string')
  );
}

async function readPersistedSettings(): Promise<PersistedSettings> {
  return (
    (await readVersionedDataset('settings', isPersistedSettings, (legacy) => {
      if (!isPersistedSettings(legacy)) throw new Error('Invalid legacy settings dataset.');
      return legacy;
    })) ?? {}
  );
}

const DEFAULT_SECRET_STATUS: AppSecretStatus = {
  geminiConfigured: false,
  traderaConfigured: false,
  encryptionAvailable: false,
  migrationStatus: 'not-needed',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'sv',
  currency: 'SEK',
  traderaAppId: undefined,
  aiMode: 'offline',
  fallbackEnabled: false,
  onboardingCompleted: false,
  ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
  secretStatus: DEFAULT_SECRET_STATUS,
};

function normalizeTrimmedValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function normalizeOllamaBaseUrl(value: string | undefined): string {
  const candidate = normalizeTrimmedValue(value, DEFAULT_OLLAMA_BASE_URL);
  try {
    const url = new URL(candidate);
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (
      url.protocol !== 'http:' ||
      !loopbackHosts.has(url.hostname) ||
      (url.port && url.port !== '11434') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return DEFAULT_OLLAMA_BASE_URL;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_OLLAMA_BASE_URL;
  }
}

function normalizePreferences(settings: PersistedSettings | undefined): AppSettings {
  const detectedLanguage =
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')
      ? 'en'
      : 'sv';
  return {
    language:
      settings?.language === 'en' || settings?.language === 'sv'
        ? settings.language
        : detectedLanguage,
    currency: 'SEK',
    traderaAppId:
      typeof settings?.traderaAppId === 'number' &&
      Number.isSafeInteger(settings.traderaAppId) &&
      settings.traderaAppId > 0
        ? settings.traderaAppId
        : undefined,
    aiMode:
      settings?.aiMode === 'gemini' ||
      settings?.aiMode === 'ollama' ||
      settings?.aiMode === 'offline'
        ? settings.aiMode
        : settings?.aiProvider === 'ollama'
          ? 'ollama'
          : settings?.aiProvider === 'gemini'
            ? 'gemini'
            : 'offline',
    fallbackEnabled: settings?.fallbackEnabled === true,
    onboardingCompleted: settings?.onboardingCompleted === true,
    ollamaBaseUrl: normalizeOllamaBaseUrl(settings?.ollamaBaseUrl),
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
      persisted = await readPersistedSettings();
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
        await writeVersionedDataset('settings', migrated);
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
    const persisted = await readPersistedSettings();
    const current = normalizePreferences(persisted);
    const next = normalizePreferences({ ...persisted, ...current, ...partial });
    const nextPersisted = { ...persisted };
    delete nextPersisted.traderaBaseUrl;
    await writeVersionedDataset('settings', {
      ...nextPersisted,
      language: next.language,
      currency: next.currency,
      traderaAppId: next.traderaAppId,
      aiMode: next.aiMode,
      fallbackEnabled: next.fallbackEnabled,
      onboardingCompleted: next.onboardingCompleted,
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
    const persisted = await readPersistedSettings();
    if (secretId === 'gemini') delete persisted.geminiApiKey;
    else delete persisted.traderaApiKey;
    await writeVersionedDataset('settings', persisted);
    return this.getSettings();
  }

  async deleteSecret(secretId: DesktopSecretId): Promise<AppSettings> {
    const bridge = desktopBridge();
    if (!bridge) throw new Error('Secret configuration requires the desktop application.');
    const persisted = await readPersistedSettings();
    if (secretId === 'gemini') delete persisted.geminiApiKey;
    else delete persisted.traderaApiKey;
    await writeVersionedDataset('settings', persisted);
    await bridge.secrets.delete(secretId);
    return this.getSettings();
  }

  async setGeminiApiKey(apiKey: string): Promise<AppSettings> {
    return apiKey.trim() ? this.setSecret('gemini', apiKey) : this.deleteSecret('gemini');
  }

  async setTraderaApiKey(apiKey: string): Promise<AppSettings> {
    return apiKey.trim() ? this.setSecret('tradera', apiKey) : this.deleteSecret('tradera');
  }

  async setTraderaAppId(traderaAppId: number | undefined): Promise<AppSettings> {
    return this.updateSettings({ traderaAppId });
  }

  async testGeminiConnection(): Promise<boolean> {
    const bridge = desktopBridge();
    if (!bridge) throw new Error('Connection tests require the desktop application.');
    const result = await bridge.ai.testGeminiConnection(DEFAULT_GEMINI_MODEL);
    return result.connected;
  }

  async testOllamaConnection(): Promise<boolean> {
    const settings = await this.getSettings();
    const provider = new OllamaProvider({
      resolveConfig: async () => ({
        baseUrl: settings.ollamaBaseUrl ?? DEFAULT_OLLAMA_BASE_URL,
        modelId: settings.ollamaModel ?? DEFAULT_OLLAMA_MODEL,
      }),
      createFallback: () => {
        throw new Error('Health checks do not create analysis fallbacks.');
      },
    });
    const status = await provider.checkHealth({ context: { timeoutMs: 5_000 } });
    return status.state === 'healthy';
  }

  async testTraderaConnection(): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.traderaAppId || !settings.secretStatus.traderaConfigured) return false;
    const result = await getDesktopBridge().marketplace.fetchTraderaComparables({
      appId: settings.traderaAppId,
      query: 'test',
      limit: 1,
    });
    return result.configured;
  }

  async setAiMode(aiMode: AppSettings['aiMode']): Promise<AppSettings> {
    return this.updateSettings({ aiMode });
  }

  async setFallbackEnabled(fallbackEnabled: boolean): Promise<AppSettings> {
    return this.updateSettings({ fallbackEnabled });
  }

  async completeOnboarding(
    language: AppSettings['language'],
    aiMode: AppSettings['aiMode'],
    fallbackEnabled: boolean,
  ): Promise<AppSettings> {
    return this.updateSettings({ language, aiMode, fallbackEnabled, onboardingCompleted: true });
  }

  async setOllamaBaseUrl(ollamaBaseUrl: string): Promise<AppSettings> {
    return this.updateSettings({ ollamaBaseUrl });
  }

  async setOllamaModel(ollamaModel: string): Promise<AppSettings> {
    return this.updateSettings({ ollamaModel });
  }
}

export const settingsService = SettingsService.getInstance();
