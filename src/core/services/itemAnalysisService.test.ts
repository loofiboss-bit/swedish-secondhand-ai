import { beforeEach, describe, expect, it, vi } from 'vitest';

const { desktopAnalyzeMock, getSettingsMock, loggerWarnMock } = vi.hoisted(() => ({
  desktopAnalyzeMock: vi.fn(),
  getSettingsMock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock('@core/services/settingsService', () => ({
  settingsService: {
    getSettings: getSettingsMock,
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    warn: loggerWarnMock,
  },
}));

import { itemAnalysisService } from './itemAnalysisService';
import { aiProviderRegistry } from '@core/ai';
import { GeminiProvider } from '@core/ai/providers/gemini';
import { OllamaProvider } from '@core/ai/providers/ollama';

describe('itemAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.desktop = {
      platform: 'linux',
      secrets: {
        getStatus: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      ai: { analyzeGemini: desktopAnalyzeMock, testGeminiConnection: vi.fn() },
      marketplace: { fetchTraderaComparables: vi.fn() },
    };
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      traderaAppId: 1234,
      aiMode: 'gemini',
      fallbackEnabled: false,
      onboardingCompleted: true,
      secretStatus: {
        geminiConfigured: false,
        traderaConfigured: false,
        encryptionAvailable: true,
        migrationStatus: 'not-needed',
      },
    });
  });

  it('registers Gemini and Ollama through the provider registry', () => {
    expect(aiProviderRegistry.get('gemini')).toBeInstanceOf(GeminiProvider);
    expect(aiProviderRegistry.get('ollama')).toBeInstanceOf(OllamaProvider);
  });

  it('keeps missing Gemini configuration actionable', async () => {
    const error = Object.assign(new Error('Gemini is not configured.'), {
      code: 'invalid_configuration',
    });
    desktopAnalyzeMock.mockRejectedValue(error);
    await expect(
      itemAnalysisService.analyzeInput('IKEA stol i bra skick', []),
    ).rejects.toMatchObject({
      code: 'invalid_configuration',
      providerId: 'gemini',
    });
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });

  it('returns fallback for empty input', async () => {
    const result = await itemAnalysisService.analyzeInput('', []);
    expect(result.fingerprint.title).toBe('Unspecified item');
    expect(result.fingerprint.confidence).toBe(0.2);
    expect(result.mode).toBe('offline');
  });

  it('routes configured Gemini analysis through the registered adapter', async () => {
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      traderaAppId: 1234,
      aiMode: 'gemini',
      fallbackEnabled: false,
      onboardingCompleted: true,
      secretStatus: {
        geminiConfigured: true,
        traderaConfigured: false,
        encryptionAvailable: true,
        migrationStatus: 'not-needed',
      },
    });
    desktopAnalyzeMock.mockResolvedValue({
      text: JSON.stringify({
        title: 'Gemini chair',
        category: 'Furniture',
        brand: 'IKEA',
        model: 'POÄNG',
        conditionGrade: 'good',
        attributes: {},
        detectedLanguage: 'sv',
        confidence: 0.9,
      }),
    });

    const result = await itemAnalysisService.analyzeInput('IKEA stol i bra skick', []);

    expect(desktopAnalyzeMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      mode: 'gemini',
      fingerprint: { title: 'Gemini chair', model: 'POÄNG', confidence: 0.9 },
    });
    expect(result.candidates[0]).toMatchObject({ source: 'gemini' });
  });

  it('uses deterministic fallback for a transient configured-provider failure', async () => {
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      traderaAppId: 1234,
      aiMode: 'gemini',
      fallbackEnabled: true,
      onboardingCompleted: true,
      secretStatus: {
        geminiConfigured: true,
        traderaConfigured: false,
        encryptionAvailable: true,
        migrationStatus: 'not-needed',
      },
    });
    desktopAnalyzeMock.mockRejectedValue(
      Object.assign(new Error('network unavailable'), { code: 'network' }),
    );

    const result = await itemAnalysisService.analyzeInput('IKEA stol i bra skick', []);

    expect(result).toMatchObject({
      mode: 'offline',
      fingerprint: {
        brand: 'IKEA',
        conditionGrade: 'good',
        detectedLanguage: 'sv',
        confidence: 0.45,
      },
    });
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'AI analysis unavailable. Falling back to heuristic analysis.',
      { providerId: 'gemini', errorCode: 'network' },
    );
  });

  it('uses deterministic offline analysis without calling a provider', async () => {
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      traderaAppId: 1234,
      aiMode: 'offline',
      fallbackEnabled: false,
      onboardingCompleted: true,
      secretStatus: {
        geminiConfigured: false,
        traderaConfigured: false,
        encryptionAvailable: false,
        migrationStatus: 'not-needed',
      },
    });

    const result = await itemAnalysisService.analyzeInput('Sony kamera i bra skick', []);

    expect(result).toMatchObject({
      mode: 'offline',
      fingerprint: { brand: 'Sony', conditionGrade: 'good', confidence: 0.45 },
    });
    expect(result.knowledgeGaps.map((gap) => gap.key)).toContain('model');
    expect(desktopAnalyzeMock).not.toHaveBeenCalled();
  });

  it('does not silently fall back when transient fallback is disabled', async () => {
    desktopAnalyzeMock.mockRejectedValue(
      Object.assign(new Error('network unavailable'), { code: 'network' }),
    );

    await expect(itemAnalysisService.analyzeInput('IKEA stol', [])).rejects.toMatchObject({
      code: 'network',
    });
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });
});
