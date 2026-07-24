import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { CHANNELS, registerIpcHandlers } = require('./ipc-handlers.cjs') as {
  CHANNELS: Record<string, string>;
  registerIpcHandlers: (options: Record<string, unknown>) => void;
};

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

function trustedEvent(url = 'http://127.0.0.1:5173/') {
  const mainFrame = { url };
  return { senderFrame: mainFrame, sender: { mainFrame } };
}

describe('desktop IPC handlers', () => {
  const handlers = new Map<string, Handler>();
  const vault = {
    getStatus: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
  const services = {
    analyzeGemini: vi.fn(),
    testGeminiConnection: vi.fn(),
    fetchTraderaComparables: vi.fn(),
  };

  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
    registerIpcHandlers({
      ipcMain: {
        handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
      },
      senderPolicy: { isDev: true, productionIndexPath: '' },
      vault,
      services,
    });
  });

  it('returns secret status without returning secret values', async () => {
    vault.getStatus.mockResolvedValue({
      gemini: { configured: true },
      tradera: { configured: false },
      encryptionAvailable: true,
    });

    const result = await handlers.get(CHANNELS.secretStatus)?.(trustedEvent());

    expect(result).toEqual({
      ok: true,
      value: {
        gemini: { configured: true },
        tradera: { configured: false },
        encryptionAvailable: true,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/api.?key|authorization/i);
  });

  it('validates secret writes before calling the vault', async () => {
    const result = await handlers.get(CHANNELS.secretUpdate)?.(trustedEvent(), {
      secretId: 'unsupported',
      value: 'secret-value',
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'ipc_validation' } });
    expect(vault.set).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('secret-value');
  });

  it('rejects an unauthorized sender before any operation', async () => {
    const frame = { url: 'https://attacker.example/' };
    const result = await handlers.get(CHANNELS.secretStatus)?.({
      senderFrame: frame,
      sender: { mainFrame: frame },
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'ipc_validation' } });
    expect(vault.getStatus).not.toHaveBeenCalled();
  });

  it('forwards only validated analysis payloads', async () => {
    services.analyzeGemini.mockResolvedValue({ text: '{"title":"Chair"}' });
    const payload = {
      prompt: 'Analyze this item',
      images: ['data:image/jpeg;base64,AAA'],
      language: 'sv',
      modelId: 'gemini-test',
    };

    const result = await handlers.get(CHANNELS.analyzeGemini)?.(trustedEvent(), payload);

    expect(result).toMatchObject({ ok: true });
    expect(services.analyzeGemini).toHaveBeenCalledWith(payload);
  });

  it('validates connection tests and Tradera destinations', async () => {
    services.testGeminiConnection.mockResolvedValue({ connected: true });
    const connection = await handlers.get(CHANNELS.testGeminiConnection)?.(trustedEvent(), {
      modelId: 'gemini-test',
    });
    expect(connection).toEqual({ ok: true, value: { connected: true } });

    const forbidden = await handlers.get(CHANNELS.traderaComparables)?.(trustedEvent(), {
      baseUrl: 'https://attacker.example/v3',
      query: 'Chair',
      limit: 20,
    });
    expect(forbidden).toMatchObject({ ok: false, error: { code: 'ipc_validation' } });
    expect(services.fetchTraderaComparables).not.toHaveBeenCalled();
  });

  it('limits concurrent provider operations before they reach the protected service', async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    services.analyzeGemini.mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve)),
    );
    const payload = {
      prompt: 'Analyze this item',
      images: [],
      language: 'sv',
      modelId: 'gemini-test',
    };

    const first = handlers.get(CHANNELS.analyzeGemini)?.(trustedEvent(), payload);
    const second = handlers.get(CHANNELS.analyzeGemini)?.(trustedEvent(), payload);
    const third = await handlers.get(CHANNELS.analyzeGemini)?.(trustedEvent(), payload);

    expect(third).toMatchObject({ ok: false, error: { code: 'rate_limit' } });
    expect(services.analyzeGemini).toHaveBeenCalledTimes(2);
    resolvers.forEach((resolve) => resolve({ text: '{}' }));
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });
});
