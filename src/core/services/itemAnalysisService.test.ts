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
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
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
    expect(result.title).toBe('Unspecified item');
    expect(result.confidence).toBe(0.2);
  });

  it('routes configured Gemini analysis through the registered adapter', async () => {
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
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
    expect(result).toMatchObject({ title: 'Gemini chair', model: 'POÄNG', confidence: 0.9 });
  });

  it('uses deterministic fallback for a transient configured-provider failure', async () => {
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
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
      brand: 'IKEA',
      conditionGrade: 'good',
      detectedLanguage: 'sv',
      confidence: 0.45,
    });
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'AI analysis unavailable. Falling back to heuristic analysis.',
      { providerId: 'gemini', errorCode: 'network' },
    );
  });
});
