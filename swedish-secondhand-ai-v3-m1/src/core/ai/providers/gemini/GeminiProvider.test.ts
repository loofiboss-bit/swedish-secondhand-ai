import { describe, expect, it, vi } from 'vitest';
import { AiProviderError } from '@core/ai/contracts';
import type { ItemFingerprint } from '@core/types';
import type { GeminiClient, GeminiGenerateContentRequest } from './GeminiProvider';
import { GeminiProvider } from './GeminiProvider';

const fallback: ItemFingerprint = {
  title: 'Fallback title',
  category: 'General',
  brand: 'Unknown',
  model: 'Unknown',
  conditionGrade: 'unknown',
  attributes: { source: 'fallback' },
  detectedLanguage: 'sv',
  confidence: 0.45,
};

function createProvider(
  generateContent: GeminiClient['generateContent'],
  config: { apiKey?: string; modelId?: string; timeoutMs?: number } = {},
) {
  return new GeminiProvider({
    resolveConfig: vi.fn().mockResolvedValue({
      apiKey: config.apiKey ?? 'test-api-key',
      modelId: config.modelId ?? 'test-gemini-model',
      timeoutMs: config.timeoutMs,
    }),
    createFallback: () => fallback,
    createClient: vi.fn(() => ({ generateContent })),
    now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(125),
  });
}

function expectProviderError(error: unknown, code: AiProviderError['code']): void {
  expect(error).toBeInstanceOf(AiProviderError);
  expect(error).toMatchObject({ code, providerId: 'gemini' });
}

describe('GeminiProvider', () => {
  it('analyzes text with the configured model and normalized metadata', async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        title: 'IKEA Poäng fåtölj',
        category: 'Furniture',
        brand: 'IKEA',
        model: 'Poäng',
        conditionGrade: 'good',
        attributes: { color: 'black' },
        detectedLanguage: 'sv',
        confidence: 0.92,
      }),
    });
    const provider = createProvider(generateContent);

    const result = await provider.analyzeItem({
      text: 'IKEA Poäng fåtölj i bra skick',
      images: [],
      language: 'sv',
    });

    expect(result.fingerprint).toMatchObject({
      title: 'IKEA Poäng fåtölj',
      brand: 'IKEA',
      model: 'Poäng',
      conditionGrade: 'good',
      confidence: 0.92,
    });
    expect(result.metadata).toEqual({
      providerId: 'gemini',
      modelId: 'test-gemini-model',
      durationMs: 25,
    });
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-gemini-model',
        contents: {
          parts: [
            expect.objectContaining({
              text: expect.stringContaining('IKEA Poäng fåtölj i bra skick'),
            }),
          ],
        },
      }),
    );
  });

  it('passes at most two valid images and preserves the configured timeout', async () => {
    let request: GeminiGenerateContentRequest | undefined;
    const generateContent = vi.fn(async (value: GeminiGenerateContentRequest) => {
      request = value;
      return { text: '{"title":"Camera"}' };
    });
    const provider = createProvider(generateContent, { timeoutMs: 12_345 });

    await provider.analyzeItem({
      text: 'Camera',
      images: [
        { dataUrl: 'data:image/jpeg;base64,AAA' },
        { dataUrl: 'not-a-data-url' },
        { dataUrl: 'data:image/png;base64,BBB' },
        { dataUrl: 'data:image/webp;base64,CCC' },
      ],
    });

    expect(request?.contents.parts).toEqual([
      expect.objectContaining({ text: expect.stringContaining('Camera') }),
      { inlineData: { mimeType: 'image/jpeg', data: 'AAA' } },
    ]);
    expect(request?.config.httpOptions.timeout).toBe(12_345);
  });

  it('rejects a missing API key before creating a client', async () => {
    const provider = createProvider(vi.fn(), { apiKey: '   ' });

    await expect(provider.analyzeItem({ text: 'Chair', images: [] })).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, 'invalid_configuration');
        return true;
      },
    );
  });

  it('rejects invalid JSON as a normalized invalid-response error', async () => {
    const provider = createProvider(vi.fn().mockResolvedValue({ text: 'not json' }));

    await expect(provider.analyzeItem({ text: 'Chair', images: [] })).rejects.toSatisfy(
      (error: unknown) => {
        expectProviderError(error, 'invalid_response');
        return true;
      },
    );
  });

  it('normalizes partial structured output against the deterministic fallback', async () => {
    const provider = createProvider(
      vi.fn().mockResolvedValue({
        text: JSON.stringify({
          title: '  Sony camera  ',
          conditionGrade: 'impossible',
          detectedLanguage: 'de',
          confidence: 2,
          attributes: { color: 'black', count: 2 },
        }),
      }),
    );

    const result = await provider.analyzeItem({ text: 'Sony camera', images: [] });

    expect(result.fingerprint).toEqual({
      ...fallback,
      title: 'Sony camera',
      attributes: { color: 'black' },
      confidence: 1,
    });
  });

  it.each([
    [{ status: 401 }, 'authentication', false],
    [{ status: 429 }, 'rate_limit', true],
    [{ status: 504 }, 'timeout', true],
  ] as const)('maps provider failure %# to %s', async (failure, code, retryable) => {
    const provider = createProvider(vi.fn().mockRejectedValue(failure));

    try {
      await provider.analyzeItem({ text: 'Chair', images: [] });
      expect.unreachable('Expected GeminiProvider to reject');
    } catch (error) {
      expectProviderError(error, code);
      expect(error).toMatchObject({ retryable });
    }
  });

  it('maps an aborted request to cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = createProvider(vi.fn());

    try {
      await provider.analyzeItem({
        text: 'Chair',
        images: [],
        context: { signal: controller.signal },
      });
      expect.unreachable('Expected GeminiProvider to reject');
    } catch (error) {
      expectProviderError(error, 'cancellation');
    }
  });
});
