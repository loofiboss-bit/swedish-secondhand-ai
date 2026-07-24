import { describe, expect, it, vi } from 'vitest';

vi.mock('@core/services/settingsService', () => ({
  settingsService: {
    getSettings: vi.fn().mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
    }),
  },
}));

import { itemAnalysisService } from './itemAnalysisService';

describe('itemAnalysisService', () => {
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
});
