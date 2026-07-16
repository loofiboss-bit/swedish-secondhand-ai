import type {
  AiProvider,
  AiProviderCapabilities,
  AiProviderHealthStatus,
  ItemAnalysisRequest,
  ItemAnalysisResponse,
  ProviderHealthRequest,
} from '@core/ai/contracts';
import { AiProviderError } from '@core/ai/contracts';
import type { ItemFingerprint } from '@core/types';
import {
  DEFAULT_OLLAMA_TIMEOUT_MS,
  type OllamaConfigResolver,
  type OllamaProviderConfig,
} from './OllamaConfig';
import { parseOllamaAnalysisResponse } from './OllamaResponseParser';
import { buildFactCandidates } from '@core/ai/factCandidates';

const SYSTEM_PROMPT = `You are a product analyzer for secondhand marketplace listings.
Return only valid JSON with these exact keys:
- title (string): concise product title
- category (string): product category
- brand (string): brand name or "Unknown"
- conditionGrade (string): one of new|like_new|good|fair|poor|unknown
- confidence (number): 0 to 1

Respond with JSON only, no other text.`;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const capabilities: AiProviderCapabilities = {
  itemAnalysis: true,
  imageInput: true,
  listingGeneration: false,
  comparableReview: false,
  healthCheck: true,
};

type ContentPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image_url'; readonly image_url: { readonly url: string } };

export type OllamaFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface OllamaProviderOptions {
  readonly resolveConfig: OllamaConfigResolver;
  readonly createFallback: (request: ItemAnalysisRequest) => ItemFingerprint;
  readonly fetch?: OllamaFetch;
  readonly now?: () => number;
}

class OllamaHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Ollama request failed with HTTP ${status}.`);
    this.name = 'OllamaHttpError';
    this.status = status;
  }
}

function normalizeConfig(config: OllamaProviderConfig): OllamaProviderConfig {
  const modelId = config.modelId.trim();
  if (!modelId) {
    throw new AiProviderError('Configure an Ollama model before using Ollama.', {
      code: 'invalid_configuration',
      providerId: 'ollama',
    });
  }

  let url: URL;
  try {
    url = new URL(config.baseUrl.trim());
  } catch {
    throw new AiProviderError('Configure a valid Ollama base URL.', {
      code: 'invalid_configuration',
      providerId: 'ollama',
    });
  }

  if (url.protocol !== 'http:') {
    throw new AiProviderError('Ollama base URL must use local HTTP.', {
      code: 'invalid_configuration',
      providerId: 'ollama',
    });
  }
  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (!loopbackHosts.has(url.hostname) || (url.port && url.port !== '11434')) {
    throw new AiProviderError('Ollama must use a loopback address on port 11434.', {
      code: 'invalid_configuration',
      providerId: 'ollama',
    });
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AiProviderError(
      'Ollama base URL must not contain credentials, query parameters, or fragments.',
      {
        code: 'invalid_configuration',
        providerId: 'ollama',
      },
    );
  }

  return {
    ...config,
    baseUrl: url.toString().replace(/\/$/, ''),
    modelId,
  };
}

function normalizeTimeout(timeoutMs: number | undefined): number {
  return typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_OLLAMA_TIMEOUT_MS;
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

function isTimeoutError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = 'name' in error && typeof error.name === 'string' ? error.name : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return name === 'TimeoutError' || message.includes('timeout') || message.includes('timed out');
}

function mapOllamaError(error: unknown, callerSignal?: AbortSignal): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (callerSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
    return new AiProviderError('Ollama analysis was cancelled.', {
      code: 'cancellation',
      providerId: 'ollama',
    });
  }
  if (isTimeoutError(error)) {
    return new AiProviderError('Ollama analysis timed out.', {
      code: 'timeout',
      providerId: 'ollama',
      retryable: true,
    });
  }

  const status = errorStatus(error);
  if (status === 401 || status === 403) {
    return new AiProviderError('Ollama rejected the request.', {
      code: 'authentication',
      providerId: 'ollama',
    });
  }
  if (status === 404) {
    return new AiProviderError('The configured Ollama model or endpoint was not found.', {
      code: 'model_not_found',
      providerId: 'ollama',
    });
  }
  if (status === 429) {
    return new AiProviderError('Ollama is busy. Try again later.', {
      code: 'rate_limit',
      providerId: 'ollama',
      retryable: true,
    });
  }
  if (status === 408 || status === 504) {
    return new AiProviderError('Ollama analysis timed out.', {
      code: 'timeout',
      providerId: 'ollama',
      retryable: true,
    });
  }
  if (status === undefined ? error instanceof TypeError : status >= 500) {
    return new AiProviderError('Ollama could not be reached.', {
      code: 'network',
      providerId: 'ollama',
      retryable: true,
    });
  }

  return new AiProviderError('Ollama item analysis failed.', {
    code: 'unknown',
    providerId: 'ollama',
  });
}

function buildContent(request: ItemAnalysisRequest): ContentPart[] {
  const content: ContentPart[] = [];
  if (request.text) content.push({ type: 'text', text: request.text });
  request.images.slice(0, 3).forEach((image) => {
    content.push({ type: 'image_url', image_url: { url: image.dataUrl } });
  });
  return content;
}

function extractMessageContent(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('choices' in value)) return '';
  const choices = value.choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0];
  if (typeof first !== 'object' || first === null || !('message' in first)) return '';
  const message = first.message;
  if (typeof message !== 'object' || message === null || !('content' in message)) return '';
  return typeof message.content === 'string' ? message.content : '';
}

async function readBoundedJsonResponse(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new AiProviderError('Ollama response exceeded the local safety limit.', {
      code: 'invalid_response',
      providerId: 'ollama',
    });
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new AiProviderError('Ollama response exceeded the local safety limit.', {
        code: 'invalid_response',
        providerId: 'ollama',
      });
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AiProviderError('Ollama returned invalid JSON.', {
        code: 'invalid_response',
        providerId: 'ollama',
      });
    }
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new AiProviderError('Ollama response exceeded the local safety limit.', {
        code: 'invalid_response',
        providerId: 'ollama',
      });
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new AiProviderError('Ollama returned invalid JSON.', {
      code: 'invalid_response',
      providerId: 'ollama',
    });
  }
}

export class OllamaProvider implements AiProvider {
  readonly id = 'ollama';
  readonly capabilities = capabilities;
  private readonly resolveConfig: OllamaConfigResolver;
  private readonly createFallback: OllamaProviderOptions['createFallback'];
  private readonly fetch: OllamaFetch;
  private readonly now: () => number;

  constructor(options: OllamaProviderOptions) {
    this.resolveConfig = options.resolveConfig;
    this.createFallback = options.createFallback;
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
  }

  async analyzeItem(request: ItemAnalysisRequest): Promise<ItemAnalysisResponse> {
    const startedAt = this.now();

    try {
      if (request.context?.signal?.aborted) {
        throw new DOMException('The request was aborted.', 'AbortError');
      }

      const config = normalizeConfig(await this.resolveConfig());
      const timeoutMs = normalizeTimeout(request.context?.timeoutMs ?? config.timeoutMs);
      const response = await this.fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: requestSignal(request.context?.signal, timeoutMs),
        body: JSON.stringify({
          model: config.modelId,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildContent(request) },
          ],
          stream: false,
        }),
      });

      if (!response.ok) throw new OllamaHttpError(response.status);
      const rawContent = extractMessageContent(await readBoundedJsonResponse(response));

      const fingerprint = parseOllamaAnalysisResponse(rawContent, this.createFallback(request));
      return {
        fingerprint,
        candidates: buildFactCandidates(
          fingerprint,
          { ...request, images: request.images.slice(0, 3) },
          'ollama',
        ),
        metadata: {
          providerId: this.id,
          modelId: config.modelId,
          durationMs: Math.max(0, this.now() - startedAt),
        },
      };
    } catch (error) {
      throw mapOllamaError(error, request.context?.signal);
    }
  }

  async checkHealth(request: ProviderHealthRequest): Promise<AiProviderHealthStatus> {
    const startedAt = this.now();

    try {
      const config = normalizeConfig(await this.resolveConfig());
      const timeoutMs = normalizeTimeout(request.context?.timeoutMs ?? config.timeoutMs);
      const response = await this.fetch(`${config.baseUrl}/models`, {
        method: 'GET',
        signal: requestSignal(request.context?.signal, timeoutMs),
      });
      if (!response.ok) throw new OllamaHttpError(response.status);

      return {
        providerId: this.id,
        state: 'healthy',
        checkedAt: new Date(startedAt).toISOString(),
        latencyMs: Math.max(0, this.now() - startedAt),
        capabilities: this.capabilities,
      };
    } catch (error) {
      const normalized = mapOllamaError(error, request.context?.signal);
      if (normalized.code === 'cancellation') throw normalized;

      return {
        providerId: this.id,
        state: normalized.code === 'invalid_configuration' ? 'unconfigured' : 'unavailable',
        checkedAt: new Date(startedAt).toISOString(),
        latencyMs: Math.max(0, this.now() - startedAt),
        message: normalized.message,
        capabilities: this.capabilities,
      };
    }
  }
}
