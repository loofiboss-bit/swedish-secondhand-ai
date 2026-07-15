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
      baseUrl: 'https://api.tradera.com/v3',
      query: 'Chair',
      limit: 20,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.tradera.com/v3/search',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tradera-secret' }),
      }),
    );
    expect(result).toEqual({ configured: true, data: { items: [] } });
    expect(JSON.stringify(result)).not.toContain('tradera-secret');
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
