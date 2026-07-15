import { describe, expect, it, vi } from 'vitest';
import { AiProviderError } from '@core/ai/contracts';
import type { ItemFingerprint } from '@core/types';
import type { OllamaFetch } from './OllamaProvider';
import { OllamaProvider } from './OllamaProvider';

const fallback: ItemFingerprint = {
  title: 'Fallback item',
  category: 'General',
  brand: 'Unknown',
  model: 'Unknown',
  conditionGrade: 'unknown',
  attributes: {},
  detectedLanguage: 'sv',
  confidence: 0.45,
};

function jsonResponse(value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function createProvider(
  fetch: OllamaFetch,
  config: { baseUrl?: string; modelId?: string; timeoutMs?: number } = {},
) {
  return new OllamaProvider({
    resolveConfig: vi.fn().mockResolvedValue({
      baseUrl: config.baseUrl ?? 'http://localhost:11434/v1/',
      modelId: config.modelId ?? 'llava-test',
      timeoutMs: config.timeoutMs,
    }),
    createFallback: () => fallback,
    fetch,
    now: vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_025),
  });
}

function expectProviderError(error: unknown, code: AiProviderError['code']): void {
  expect(error).toBeInstanceOf(AiProviderError);
  expect(error).toMatchObject({ code, providerId: 'ollama' });
}

describe('OllamaProvider', () => {
  it('sends the existing text and vision request through the provider contract', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Sony camera',
                category: 'Electronics',
                brand: 'Sony',
                conditionGrade: 'good',
                confidence: 0.81,
              }),
            },
          },
        ],
      }),
    );
    const provider = createProvider(fetch);

    const result = await provider.analyzeItem({
      text: 'Sony camera i bra skick',
      images: [
        { dataUrl: 'data:image/jpeg;base64,AAA' },
        { dataUrl: 'data:image/jpeg;base64,BBB' },
        { dataUrl: 'data:image/jpeg;base64,CCC' },
        { dataUrl: 'data:image/jpeg;base64,DDD' },
      ],
    });

    expect(result.fingerprint).toEqual({
      ...fallback,
      title: 'Sony camera',
      category: 'Electronics',
      brand: 'Sony',
      conditionGrade: 'good',
      confidence: 0.81,
    });
    expect(result.metadata).toEqual({
      providerId: 'ollama',
      modelId: 'llava-test',
      durationMs: 25,
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      model: string;
      messages: Array<{ role: string; content: unknown }>;
    };
    expect(body.model).toBe('llava-test');
    expect(body.messages[1]?.content).toEqual([
      { type: 'text', text: 'Sony camera i bra skick' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAA' } },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,BBB' } },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,CCC' } },
    ]);
  });

  it.each([
    [{ baseUrl: 'not a url' }, 'invalid_configuration'],
    [{ baseUrl: 'ftp://localhost:11434/v1' }, 'invalid_configuration'],
    [{ baseUrl: 'https://localhost:11434/v1' }, 'invalid_configuration'],
    [{ baseUrl: 'http://remote.example:11434/v1' }, 'invalid_configuration'],
    [{ baseUrl: 'http://localhost:11435/v1' }, 'invalid_configuration'],
    [{ baseUrl: 'http://user:pass@localhost:11434/v1' }, 'invalid_configuration'],
    [{ baseUrl: 'http://localhost:11434/v1?token=value' }, 'invalid_configuration'],
    [{ baseUrl: 'http://localhost:11434/v1#fragment' }, 'invalid_configuration'],
    [{ modelId: '   ' }, 'invalid_configuration'],
  ] as const)('rejects invalid configuration %#', async (config, code) => {
    const provider = createProvider(vi.fn(), config);

    try {
      await provider.analyzeItem({ text: 'Chair', images: [] });
      expect.unreachable('Expected OllamaProvider to reject');
    } catch (error) {
      expectProviderError(error, code);
    }
  });

  it('rejects malformed endpoint output instead of spreading a JSON string', async () => {
    const provider = createProvider(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ choices: [{ message: { content: 'not structured json' } }] }),
        ),
    );

    try {
      await provider.analyzeItem({ text: 'Chair', images: [] });
      expect.unreachable('Expected OllamaProvider to reject');
    } catch (error) {
      expectProviderError(error, 'invalid_response');
    }
  });

  it.each([
    [401, 'authentication', false],
    [404, 'model_not_found', false],
    [429, 'rate_limit', true],
    [504, 'timeout', true],
    [503, 'network', true],
  ] as const)('maps HTTP %s to %s', async (status, code, retryable) => {
    const provider = createProvider(
      vi.fn().mockResolvedValue(new Response('', { status, statusText: 'failure' })),
    );

    try {
      await provider.analyzeItem({ text: 'Chair', images: [] });
      expect.unreachable('Expected OllamaProvider to reject');
    } catch (error) {
      expectProviderError(error, code);
      expect(error).toMatchObject({ retryable });
    }
  });

  it('maps an unreachable endpoint to a retryable network error', async () => {
    const provider = createProvider(vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    try {
      await provider.analyzeItem({ text: 'Chair', images: [] });
      expect.unreachable('Expected OllamaProvider to reject');
    } catch (error) {
      expectProviderError(error, 'network');
      expect(error).toMatchObject({ retryable: true });
    }
  });

  it('maps timeout and caller cancellation separately', async () => {
    const timeoutProvider = createProvider(
      vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')),
    );
    await expect(timeoutProvider.analyzeItem({ text: 'Chair', images: [] })).rejects.toMatchObject({
      code: 'timeout',
    });

    const controller = new AbortController();
    controller.abort();
    const cancelledProvider = createProvider(vi.fn());
    await expect(
      cancelledProvider.analyzeItem({
        text: 'Chair',
        images: [],
        context: { signal: controller.signal },
      }),
    ).rejects.toMatchObject({ code: 'cancellation' });
  });

  it('reports healthy and unreachable endpoints without exposing configuration', async () => {
    const healthy = createProvider(vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    await expect(healthy.checkHealth({})).resolves.toMatchObject({
      providerId: 'ollama',
      state: 'healthy',
      latencyMs: 25,
    });

    const unavailable = createProvider(vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(unavailable.checkHealth({})).resolves.toMatchObject({
      providerId: 'ollama',
      state: 'unavailable',
      message: 'Ollama could not be reached.',
    });
  });

  it('propagates health-check cancellation instead of reporting an unavailable endpoint', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = createProvider(vi.fn());

    await expect(
      provider.checkHealth({ context: { signal: controller.signal } }),
    ).rejects.toMatchObject({
      code: 'cancellation',
      providerId: 'ollama',
    });
  });
});
