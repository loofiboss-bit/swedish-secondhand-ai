import type {
  AiProvider,
  AiProviderCapabilities,
  ItemAnalysisRequest,
  ItemAnalysisResponse,
} from '@core/ai/contracts';
import { AiProviderError } from '@core/ai/contracts';
import type { ItemFingerprint } from '@core/types';
import {
  DEFAULT_GEMINI_TIMEOUT_MS,
  type GeminiConfigResolver,
  type GeminiProviderConfig,
} from './GeminiConfig';
import { parseGeminiAnalysisResponse } from './GeminiResponseParser';

type GeminiContentPart =
  | { readonly text: string }
  | { readonly inlineData: { readonly mimeType: string; readonly data: string } };

export interface GeminiGenerateContentRequest {
  readonly model: string;
  readonly contents: { readonly parts: GeminiContentPart[] };
  readonly config: {
    readonly abortSignal?: AbortSignal;
    readonly httpOptions: { readonly timeout: number };
  };
}

export interface GeminiClient {
  generateContent(request: GeminiGenerateContentRequest): Promise<{ readonly text?: string }>;
}

export type GeminiClientFactory = (apiKey: string) => GeminiClient;

export interface GeminiProviderOptions {
  readonly resolveConfig: GeminiConfigResolver;
  readonly createFallback: (request: ItemAnalysisRequest) => ItemFingerprint;
  readonly createClient?: GeminiClientFactory;
  readonly now?: () => number;
}

const capabilities: AiProviderCapabilities = {
  itemAnalysis: true,
  imageInput: true,
  listingGeneration: false,
  comparableReview: false,
  healthCheck: false,
};

function normalizeConfig(config: GeminiProviderConfig): GeminiProviderConfig {
  const apiKey = config.apiKey.trim();
  const modelId = config.modelId.trim();

  if (!apiKey) {
    throw new AiProviderError('Configure a Gemini API key before using Gemini.', {
      code: 'invalid_configuration',
      providerId: 'gemini',
    });
  }
  if (!modelId) {
    throw new AiProviderError('Configure a Gemini model before using Gemini.', {
      code: 'invalid_configuration',
      providerId: 'gemini',
    });
  }

  return { ...config, apiKey, modelId };
}

function normalizeTimeout(timeoutMs: number | undefined): number {
  return typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_GEMINI_TIMEOUT_MS;
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : '';
}

function normalizedDesktopError(error: unknown): AiProviderError | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = error.code;
  if (
    ![
      'authentication',
      'rate_limit',
      'timeout',
      'cancellation',
      'network',
      'model_not_found',
      'invalid_response',
      'schema_validation',
      'invalid_configuration',
    ].includes(typeof code === 'string' ? code : '')
  ) {
    return undefined;
  }
  return new AiProviderError(
    error instanceof Error ? error.message : 'Gemini desktop operation failed.',
    {
      code: code as AiProviderError['code'],
      providerId: 'gemini',
      retryable: ['rate_limit', 'timeout', 'network'].includes(String(code)),
    },
  );
}

function mapGeminiError(error: unknown, signal?: AbortSignal): AiProviderError {
  if (error instanceof AiProviderError && error.providerId) return error;
  const desktopError = normalizedDesktopError(error);
  if (desktopError) return desktopError;
  if (signal?.aborted || errorName(error) === 'AbortError') {
    return new AiProviderError('Gemini analysis was cancelled.', {
      code: 'cancellation',
      providerId: 'gemini',
    });
  }

  const status = errorStatus(error);
  if (status === 401 || status === 403) {
    return new AiProviderError('Gemini rejected the configured API key.', {
      code: 'authentication',
      providerId: 'gemini',
    });
  }
  if (status === 429) {
    return new AiProviderError('Gemini rate limit reached. Try again later.', {
      code: 'rate_limit',
      providerId: 'gemini',
      retryable: true,
    });
  }
  if (status === 404) {
    return new AiProviderError('The configured Gemini model was not found.', {
      code: 'model_not_found',
      providerId: 'gemini',
    });
  }
  if (
    status === 408 ||
    status === 504 ||
    errorName(error) === 'TimeoutError' ||
    errorMessage(error).includes('timeout') ||
    errorMessage(error).includes('timed out')
  ) {
    return new AiProviderError('Gemini analysis timed out.', {
      code: 'timeout',
      providerId: 'gemini',
      retryable: true,
    });
  }
  if (status === undefined ? error instanceof TypeError : status >= 500) {
    return new AiProviderError('Gemini could not be reached.', {
      code: 'network',
      providerId: 'gemini',
      retryable: true,
    });
  }

  return new AiProviderError('Gemini item analysis failed.', {
    code: 'unknown',
    providerId: 'gemini',
  });
}

function buildParts(request: ItemAnalysisRequest): GeminiContentPart[] {
  const imageParts = request.images.slice(0, 2).flatMap((image) => {
    const mimeMatch = image.dataUrl.match(/^data:([^;]+);base64,/);
    if (!mimeMatch) return [];

    return [
      {
        inlineData: {
          mimeType: mimeMatch[1],
          data: image.dataUrl.replace(/^data:[^;]+;base64,/, ''),
        },
      },
    ];
  });

  return [
    {
      text: `Analyze this Swedish secondhand item and return ONLY JSON with fields: title, category, brand, model, conditionGrade, attributes (object), detectedLanguage (sv|en), confidence (0-1). Text description: ${request.text || 'No text provided'}`,
    },
    ...imageParts,
  ];
}

export class GeminiProvider implements AiProvider {
  readonly id = 'gemini';
  readonly capabilities = capabilities;
  private readonly resolveConfig: GeminiConfigResolver;
  private readonly createFallback: GeminiProviderOptions['createFallback'];
  private readonly createClient: GeminiClientFactory;
  private readonly now: () => number;

  constructor(options: GeminiProviderOptions) {
    this.resolveConfig = options.resolveConfig;
    this.createFallback = options.createFallback;
    this.createClient =
      options.createClient ??
      (() => {
        throw new AiProviderError('Gemini requires a configured desktop transport.', {
          code: 'invalid_configuration',
          providerId: 'gemini',
        });
      });
    this.now = options.now ?? (() => performance.now());
  }

  async analyzeItem(request: ItemAnalysisRequest): Promise<ItemAnalysisResponse> {
    const startedAt = this.now();

    try {
      if (request.context?.signal?.aborted) {
        throw new AiProviderError('Gemini analysis was cancelled.', {
          code: 'cancellation',
          providerId: 'gemini',
        });
      }

      const config = normalizeConfig(await this.resolveConfig());
      const timeout = normalizeTimeout(request.context?.timeoutMs ?? config.timeoutMs);
      const response = await this.createClient(config.apiKey).generateContent({
        model: config.modelId,
        contents: { parts: buildParts(request) },
        config: {
          abortSignal: request.context?.signal,
          httpOptions: { timeout },
        },
      });

      return {
        fingerprint: parseGeminiAnalysisResponse(response.text ?? '', this.createFallback(request)),
        metadata: {
          providerId: this.id,
          modelId: config.modelId,
          durationMs: Math.max(0, this.now() - startedAt),
        },
      };
    } catch (error) {
      throw mapGeminiError(error, request.context?.signal);
    }
  }
}
