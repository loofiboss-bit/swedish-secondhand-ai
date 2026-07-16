import { describe, expect, it, vi } from 'vitest';
import { AiProviderError } from './contracts';
import type { AiProvider, ItemAnalysisResponse } from './contracts';
import { AiProviderRegistry } from './AiProviderRegistry';
import { AiRouter, canUseHeuristicFallback } from './AiRouter';

const response: ItemAnalysisResponse = {
  fingerprint: {
    title: 'Chair',
    category: 'Furniture',
    brand: 'Unknown',
    model: 'Unknown',
    conditionGrade: 'good',
    attributes: {},
    detectedLanguage: 'en',
    confidence: 0.8,
  },
  candidates: [],
  metadata: { providerId: 'ollama', modelId: 'local-model' },
};

function provider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    id: 'ollama',
    capabilities: {
      itemAnalysis: true,
      imageInput: true,
      listingGeneration: false,
      comparableReview: false,
      healthCheck: true,
    },
    analyzeItem: vi.fn().mockResolvedValue(response),
    checkHealth: vi.fn().mockResolvedValue({
      providerId: 'ollama',
      state: 'healthy',
      checkedAt: '2026-07-14T00:00:00.000Z',
    }),
    ...overrides,
  };
}

describe('AiRouter', () => {
  it('routes analysis and preserves provider metadata', async () => {
    const adapter = provider();
    const router = new AiRouter(new AiProviderRegistry([adapter]));

    await expect(router.analyzeItem('ollama', { text: 'Chair', images: [] })).resolves.toEqual(
      response,
    );
    expect(adapter.analyzeItem).toHaveBeenCalledWith({ text: 'Chair', images: [] });
  });

  it('rejects unsupported analysis and health capabilities', async () => {
    const adapter = provider({
      capabilities: {
        itemAnalysis: false,
        imageInput: false,
        listingGeneration: false,
        comparableReview: false,
        healthCheck: false,
      },
      analyzeItem: undefined,
      checkHealth: undefined,
    });
    const router = new AiRouter(new AiProviderRegistry([adapter]));

    await expect(router.analyzeItem('ollama', { text: 'Chair', images: [] })).rejects.toMatchObject(
      {
        code: 'unsupported_capability',
      },
    );
    await expect(router.checkHealth('ollama')).rejects.toMatchObject({
      code: 'unsupported_capability',
    });
  });

  it('delegates provider health checks', async () => {
    const adapter = provider();
    const router = new AiRouter(new AiProviderRegistry([adapter]));

    await expect(router.checkHealth('ollama')).resolves.toMatchObject({ state: 'healthy' });
    expect(adapter.checkHealth).toHaveBeenCalledWith({});
  });
});

describe('canUseHeuristicFallback', () => {
  it.each(['network', 'timeout', 'rate_limit', 'invalid_response', 'schema_validation'] as const)(
    'allows deterministic fallback for %s failures',
    (code) => {
      expect(
        canUseHeuristicFallback(
          new AiProviderError('temporary failure', {
            code,
            providerId: 'ollama',
          }),
        ),
      ).toBe(true);
    },
  );

  it.each(['authentication', 'cancellation', 'invalid_configuration', 'model_not_found'] as const)(
    'keeps %s failures actionable',
    (code) => {
      expect(
        canUseHeuristicFallback(
          new AiProviderError('action required', {
            code,
            providerId: 'ollama',
          }),
        ),
      ).toBe(false);
    },
  );
});
