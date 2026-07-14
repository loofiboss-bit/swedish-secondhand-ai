import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContentMock, getSettingsMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  getSettingsMock: vi.fn(),
}));

vi.mock('@core/services/settingsService', () => ({
  settingsService: {
    getSettings: getSettingsMock,
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

import { itemAnalysisService } from './itemAnalysisService';
import { aiProviderRegistry } from '@core/ai';
import { GeminiProvider } from '@core/ai/providers/gemini';

describe('itemAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
    });
  });

  it('registers Gemini through the provider registry', () => {
    expect(aiProviderRegistry.get('gemini')).toBeInstanceOf(GeminiProvider);
  });

  it('falls back to heuristic analysis when no api key is set', async () => {
    const result = await itemAnalysisService.analyzeInput('IKEA stol i bra skick', []);

    expect(result.brand).toBe('IKEA');
    expect(result.conditionGrade).toBe('good');
    expect(result.detectedLanguage).toBe('sv');
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
      geminiApiKey: 'test-key',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      aiProvider: 'gemini',
    });
    generateContentMock.mockResolvedValue({
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

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ title: 'Gemini chair', model: 'POÄNG', confidence: 0.9 });
  });
});
