function publicError(error) {
  const knownCodes = new Set([
    'authentication',
    'cancellation',
    'invalid_configuration',
    'invalid_response',
    'ipc_validation',
    'model_not_found',
    'network',
    'rate_limit',
    'secure_storage_corrupt',
    'secure_storage_unavailable',
    'secure_storage_verification',
    'timeout',
  ]);
  const code = knownCodes.has(error?.code) ? error.code : 'unknown';
  const messages = {
    authentication: 'The configured service rejected its API key.',
    cancellation: 'The desktop operation was cancelled.',
    invalid_configuration: 'The requested service is not configured.',
    invalid_response: 'The external service returned an invalid response.',
    ipc_validation: error?.message || 'The desktop request was invalid.',
    model_not_found: 'The configured model was not found.',
    network: 'The external service could not be reached.',
    rate_limit: 'The external service is busy. Try again later.',
    secure_storage_corrupt: 'Protected secret storage could not be read.',
    secure_storage_unavailable: 'Protected OS storage is unavailable.',
    secure_storage_verification: 'The protected secret could not be verified.',
    timeout: 'The external request timed out.',
    unknown: 'The desktop operation failed.',
  };
  return { code, message: messages[code] };
}

async function createGeminiClient(apiKey) {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
}

function normalizeGeminiError(error) {
  const status = typeof error?.status === 'number' ? error.status : undefined;
  if (status === 401 || status === 403) error.code = 'authentication';
  else if (status === 404) error.code = 'model_not_found';
  else if (status === 408 || status === 504) error.code = 'timeout';
  else if (status === 429) error.code = 'rate_limit';
  else if (status !== undefined && status >= 500) error.code = 'network';
  else if (!error?.code && error instanceof TypeError) error.code = 'network';
  return error;
}

const TRADERA_RESPONSE_MAX_BYTES = 1_000_000;
const TRADERA_PRICE_MAX_SEK = 10_000_000;
const TRADERA_TIMEOUT_MS = 15_000;

function invalidResponse(message = 'The marketplace returned an invalid response.') {
  return Object.assign(new Error(message), { code: 'invalid_response' });
}

async function readBoundedJson(response, maxBytes = TRADERA_RESPONSE_MAX_BYTES) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) throw invalidResponse();

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw invalidResponse();
  if (!response.body) throw invalidResponse();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw invalidResponse();
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  try {
    return JSON.parse(text);
  } catch {
    throw invalidResponse();
  }
}

function boundedString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : undefined;
}

function boundedPrice(value) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= TRADERA_PRICE_MAX_SEK
    ? value
    : undefined;
}

function safeTraderaUrl(value) {
  const raw = boundedString(value, 2_048);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      (url.hostname !== 'tradera.com' && !url.hostname.endsWith('.tradera.com')) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeTraderaResponse(value, limit) {
  if (typeof value !== 'object' || value === null) throw invalidResponse();
  const rawItems = value.items ?? value.results ?? value.endedItems;
  if (!Array.isArray(rawItems)) throw invalidResponse();

  const items = rawItems.slice(0, Math.min(limit, 50)).flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const finalPrice = boundedPrice(raw.finalPrice);
    const price = boundedPrice(raw.price);
    const buyNowPrice = boundedPrice(raw.buyNowPrice);
    if (finalPrice === undefined && price === undefined && buyNowPrice === undefined) return [];
    return [
      {
        itemId: boundedString(raw.itemId, 160),
        id: boundedString(raw.id, 160),
        title: boundedString(raw.title, 240),
        description: boundedString(raw.description, 2_000),
        endDate: boundedString(raw.endDate, 64),
        soldAt: boundedString(raw.soldAt, 64),
        finalPrice,
        buyNowPrice,
        price,
        url: safeTraderaUrl(raw.url),
        shippingIncluded:
          typeof raw.shippingIncluded === 'boolean' ? raw.shippingIncluded : undefined,
      },
    ];
  });

  return { items };
}

function createDesktopServices({
  vault,
  fetchImpl = globalThis.fetch,
  createGeminiClientImpl = createGeminiClient,
}) {
  async function configuredGeminiClient() {
    const apiKey = await vault.read('gemini');
    if (!apiKey) {
      throw Object.assign(new Error('Gemini is not configured.'), {
        code: 'invalid_configuration',
      });
    }
    return createGeminiClientImpl(apiKey);
  }

  return {
    async analyzeGemini(payload) {
      try {
        const ai = await configuredGeminiClient();
        const imageParts = payload.images.slice(0, 2).map((dataUrl) => {
          const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
          if (!match) {
            throw Object.assign(new Error('Analysis image is invalid.'), {
              code: 'ipc_validation',
            });
          }
          return { inlineData: { mimeType: match[1], data: match[2] } };
        });
        const response = await ai.models.generateContent({
          model: payload.modelId,
          contents: {
            parts: [{ text: payload.prompt }, ...imageParts],
          },
          config: { httpOptions: { timeout: 30_000 } },
        });
        return { text: response.text ?? '' };
      } catch (error) {
        throw normalizeGeminiError(error);
      }
    },

    async testGeminiConnection(payload) {
      try {
        const ai = await configuredGeminiClient();
        await ai.models.get({ model: payload.modelId });
        return { connected: true };
      } catch (error) {
        throw normalizeGeminiError(error);
      }
    },

    async fetchTraderaComparables(payload) {
      const apiKey = await vault.read('tradera');
      if (!apiKey) return { configured: false, data: null };
      try {
        const response = await fetchImpl(`${payload.baseUrl}/search`, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(TRADERA_TIMEOUT_MS),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            query: payload.query,
            category: payload.category,
            limit: payload.limit,
            status: 'ended',
          }),
        });
        if (!response.ok) {
          const error = new Error('Tradera request failed.');
          error.code =
            response.status === 401 || response.status === 403 ? 'authentication' : 'network';
          throw error;
        }
        const data = normalizeTraderaResponse(await readBoundedJson(response), payload.limit);
        return { configured: true, data };
      } catch (error) {
        if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
          throw Object.assign(new Error('Tradera request timed out.'), { code: 'timeout' });
        }
        if (!error.code) {
          error.code = error instanceof TypeError ? 'network' : 'unknown';
        }
        throw error;
      }
    },
  };
}

module.exports = {
  createDesktopServices,
  normalizeTraderaResponse,
  publicError,
  readBoundedJson,
};
