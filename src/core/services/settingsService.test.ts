import { clear, get, set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const logger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }));
vi.mock('./loggerService', () => ({ logger }));

import { settingsService } from './settingsService';

const SETTINGS_KEY = 'swedish-secondhand-ai:settings';

function status(gemini = false, tradera = false): DesktopSecretStatus {
  return {
    gemini: { configured: gemini },
    tradera: { configured: tradera },
    encryptionAvailable: true,
    backend: 'kwallet6',
  };
}

function installBridge(overrides: Partial<DesktopBridge['secrets']> = {}) {
  const secrets: DesktopBridge['secrets'] = {
    getStatus: vi.fn().mockResolvedValue(status()),
    update: vi
      .fn()
      .mockImplementation(async (secretId) =>
        secretId === 'gemini' ? status(true, false) : status(false, true),
      ),
    delete: vi.fn().mockResolvedValue(status()),
    ...overrides,
  };
  window.desktop = {
    platform: 'linux',
    secrets,
    ai: { analyzeGemini: vi.fn(), testGeminiConnection: vi.fn() },
    marketplace: { fetchTraderaComparables: vi.fn() },
  };
  return secrets;
}

describe('settingsService secret migration', () => {
  beforeEach(async () => {
    await clear();
    vi.clearAllMocks();
    window.desktop = undefined;
  });

  it('migrates legacy plaintext only after protected-storage verification', async () => {
    await set(SETTINGS_KEY, {
      language: 'sv',
      geminiApiKey: 'legacy-gemini',
      traderaApiKey: 'legacy-tradera',
    });
    const secrets = installBridge({
      update: vi
        .fn()
        .mockResolvedValueOnce(status(true, false))
        .mockResolvedValueOnce(status(true, true)),
    });

    const settings = await settingsService.getSettings();
    const persisted = await get<Record<string, unknown>>(SETTINGS_KEY);

    expect(secrets.update).toHaveBeenNthCalledWith(1, 'gemini', 'legacy-gemini');
    expect(secrets.update).toHaveBeenNthCalledWith(2, 'tradera', 'legacy-tradera');
    expect(settings.secretStatus).toMatchObject({
      geminiConfigured: true,
      traderaConfigured: true,
      migrationStatus: 'completed',
    });
    expect(persisted).not.toHaveProperty('geminiApiKey');
    expect(persisted).not.toHaveProperty('traderaApiKey');
    expect(persisted).toHaveProperty('schemaVersion', 2);
    expect(JSON.stringify(settings)).not.toContain('legacy-gemini');
  });

  it('preserves each plaintext value whose secure migration fails', async () => {
    await set(SETTINGS_KEY, {
      geminiApiKey: 'legacy-gemini',
      traderaApiKey: 'legacy-tradera',
    });
    installBridge({
      update: vi
        .fn()
        .mockResolvedValueOnce(status(true, false))
        .mockRejectedValueOnce(Object.assign(new Error('keyring locked'), { code: 'storage' })),
    });

    const settings = await settingsService.getSettings();
    const persisted = await get<Record<string, unknown>>(SETTINGS_KEY);

    expect(settings.secretStatus.migrationStatus).toBe('failed');
    expect(persisted).not.toHaveProperty('geminiApiKey');
    expect(persisted).toHaveProperty('traderaApiKey', 'legacy-tradera');
  });

  it('overwrites an existing protected value with the verified legacy value before cleanup', async () => {
    await set(SETTINGS_KEY, { geminiApiKey: 'legacy-gemini' });
    const secrets = installBridge({
      getStatus: vi.fn().mockResolvedValue(status(true, false)),
      update: vi.fn().mockResolvedValue(status(true, false)),
    });

    await settingsService.getSettings();

    expect(secrets.update).toHaveBeenCalledWith('gemini', 'legacy-gemini');
    expect(await get<Record<string, unknown>>(SETTINGS_KEY)).not.toHaveProperty('geminiApiKey');
  });

  it('keeps legacy data pending and hidden when no desktop bridge exists', async () => {
    await set(SETTINGS_KEY, { geminiApiKey: 'legacy-gemini' });

    const settings = await settingsService.getSettings();
    const persisted = await get<Record<string, unknown>>(SETTINGS_KEY);

    expect(settings.secretStatus.migrationStatus).toBe('pending');
    expect(settings).not.toHaveProperty('geminiApiKey');
    expect(persisted).toHaveProperty('geminiApiKey', 'legacy-gemini');
  });

  it('returns configured status but never the newly saved value', async () => {
    const secrets = installBridge({
      getStatus: vi.fn().mockResolvedValue(status(true, false)),
      update: vi.fn().mockResolvedValue(status(true, false)),
    });

    const settings = await settingsService.setGeminiApiKey('new-secret');

    expect(secrets.update).toHaveBeenCalledWith('gemini', 'new-secret');
    expect(settings.secretStatus.geminiConfigured).toBe(true);
    expect(JSON.stringify(settings)).not.toContain('new-secret');
  });

  it('deletes both protected and pending legacy copies explicitly', async () => {
    await set(SETTINGS_KEY, { geminiApiKey: 'legacy-gemini' });
    const secrets = installBridge({
      getStatus: vi.fn().mockResolvedValue(status(false, false)),
      delete: vi.fn().mockResolvedValue(status(false, false)),
    });

    await settingsService.setGeminiApiKey('');

    expect(secrets.delete).toHaveBeenCalledWith('gemini');
    expect(await get<Record<string, unknown>>(SETTINGS_KEY)).not.toHaveProperty('geminiApiKey');
  });

  it('persists legacy cleanup before deleting the protected value', async () => {
    await set(SETTINGS_KEY, { geminiApiKey: 'legacy-gemini' });
    const secrets = installBridge({
      getStatus: vi.fn().mockResolvedValue(status(false, false)),
      delete: vi.fn().mockImplementation(async () => {
        expect(await get<Record<string, unknown>>(SETTINGS_KEY)).not.toHaveProperty('geminiApiKey');
        return status(false, false);
      }),
    });

    await settingsService.setGeminiApiKey('');

    expect(secrets.delete).toHaveBeenCalledWith('gemini');
  });

  it('normalizes Ollama preferences to the documented loopback endpoint', async () => {
    installBridge();

    const settings = await settingsService.setOllamaBaseUrl('https://remote.example/v1');

    expect(settings.ollamaBaseUrl).toBe('http://localhost:11434/v1');
    expect(await get<Record<string, unknown>>(SETTINGS_KEY)).toMatchObject({
      ollamaBaseUrl: 'http://localhost:11434/v1',
    });
  });
});
