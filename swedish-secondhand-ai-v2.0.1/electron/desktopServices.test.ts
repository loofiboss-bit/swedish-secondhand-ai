import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createDesktopServices, publicError } = require('./desktop-services.cjs') as {
  createDesktopServices: (options: Record<string, unknown>) => {
    analyzeGemini(payload: Record<string, unknown>): Promise<unknown>;
    testGeminiConnection(payload: Record<string, unknown>): Promise<unknown>;
    fetchTraderaComparables(payload: Record<string, unknown>): Promise<unknown>;
  };
  publicError: (error: unknown) => { code: string; message: string };
};

describe('desktop services', () => {
  it('uses the protected Gemini secret internally and returns provider output only', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: '{"title":"Chair"}' });
    const createGeminiClient = vi.fn().mockResolvedValue({
      models: { generateContent, get: vi.fn() },
    });
    const services = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('gemini-secret') },
      createGeminiClientImpl: createGeminiClient,
    });

    const result = await services.analyzeGemini({
      prompt: 'Analyze this item',
      images: [],
      modelId: 'gemini-test',
    });

    expect(createGeminiClient).toHaveBeenCalledWith('gemini-secret');
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-test' }));
    expect(result).toEqual({ text: '{"title":"Chair"}' });
    expect(JSON.stringify(result)).not.toContain('gemini-secret');
  });

  it('keeps the Tradera secret inside main-process request headers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const services = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('tradera-secret') },
      fetchImpl,
    });

    const result = await services.fetchTraderaComparables({
      appId: 1234,
      query: 'Chair',
      limit: 20,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.tradera.com/v4/search?query=Chair&pageNumber=0',
      expect.objectContaining({
        redirect: 'error',
        signal: expect.any(AbortSignal),
        headers: {
          'X-App-Id': '1234',
          'X-App-Key': 'tradera-secret',
        },
      }),
    );
    expect(result).toMatchObject({ configured: true, cached: false, data: { items: [] } });
    expect(JSON.stringify(result)).not.toContain('tradera-secret');
  });

  it('rejects oversized or non-JSON Tradera responses', async () => {
    const oversized = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('tradera-secret') },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response('{}', {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Content-Length': '1000001' },
        }),
      ),
    });
    const request = { appId: 1234, query: 'Chair', limit: 20 };

    await expect(oversized.fetchTraderaComparables(request)).rejects.toMatchObject({
      code: 'invalid_response',
    });

    const html = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('tradera-secret') },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response('<html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    });
    await expect(html.fetchTraderaComparables(request)).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('caps and sanitizes Tradera records before renderer exposure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'valid-1',
              title: 'A'.repeat(500),
              finalPrice: 450,
              url: 'https://www.tradera.com/item/valid-1',
            },
            { id: 'extreme', title: 'Extreme', finalPrice: 900_000_000 },
            { id: 'valid-2', title: 'Second', price: 500 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const services = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('tradera-secret') },
      fetchImpl,
    });

    const result = (await services.fetchTraderaComparables({
      appId: 1234,
      query: 'Chair',
      limit: 2,
    })) as { configured: boolean; data: { items: Array<Record<string, unknown>> } };

    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]).toMatchObject({ id: 'valid-1', finalPrice: 450 });
    expect(String(result.data.items[0]?.title)).toHaveLength(240);
    expect(JSON.stringify(result)).not.toContain('900000000');
  });

  it('caches identical Tradera searches for 24 hours', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const services = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('tradera-secret') },
      fetchImpl,
      nowImpl: () => Date.parse('2026-07-16T08:00:00.000Z'),
    });
    const request = { appId: 1234, query: 'Chair', limit: 20 };

    const first = await services.fetchTraderaComparables(request);
    const second = await services.fetchTraderaComparables(request);

    expect(first).toMatchObject({ cached: false });
    expect(second).toMatchObject({ cached: true });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('maps an aborted Tradera request to a public timeout code', async () => {
    const services = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('tradera-secret') },
      fetchImpl: vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')),
    });

    await expect(
      services.fetchTraderaComparables({
        appId: 1234,
        query: 'Chair',
        limit: 20,
      }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('tests Gemini connectivity without exposing the protected key', async () => {
    const getModel = vi.fn().mockResolvedValue({ name: 'models/gemini-test' });
    const createGeminiClient = vi.fn().mockResolvedValue({
      models: { generateContent: vi.fn(), get: getModel },
    });
    const services = createDesktopServices({
      vault: { read: vi.fn().mockResolvedValue('gemini-secret') },
      createGeminiClientImpl: createGeminiClient,
    });

    const result = await services.testGeminiConnection({ modelId: 'gemini-test' });

    expect(getModel).toHaveBeenCalledWith({ model: 'gemini-test' });
    expect(result).toEqual({ connected: true });
    expect(JSON.stringify(result)).not.toContain('gemini-secret');
  });

  it('normalizes errors without exposing provider messages or secrets', () => {
    const result = publicError(
      Object.assign(new Error('request with secret-value failed'), { code: 'authentication' }),
    );
    expect(result).toEqual({
      code: 'authentication',
      message: 'The configured service rejected its API key.',
    });
    expect(JSON.stringify(result)).not.toContain('secret-value');
  });
});
