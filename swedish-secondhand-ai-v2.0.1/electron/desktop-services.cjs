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
const TRADERA_SEARCH_URL = 'https://api.tradera.com/v4/search';
const TRADERA_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const TRADERA_DAILY_REQUEST_LIMIT = 100;

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

function boundedIdentifier(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  return boundedString(value, 160);
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
  const rawItems = value.items ?? value.results ?? value.endedItems ?? value.searchItems;
  if (!Array.isArray(rawItems)) throw invalidResponse();

  const items = rawItems.slice(0, Math.min(limit, 50)).flatMap((raw) => {
    if (typeof raw !== 'object' || raw === null) return [];
    const finalPrice = boundedPrice(raw.finalPrice);
    const price = boundedPrice(raw.price);
    const buyNowPrice = boundedPrice(raw.buyNowPrice);
    const maxBid = boundedPrice(raw.maxBid);
    const nextBid = boundedPrice(raw.nextBid);
    const openingBid = boundedPrice(raw.openingBid);
    const normalizedPrice = finalPrice ?? price ?? buyNowPrice ?? maxBid ?? nextBid ?? openingBid;
    if (normalizedPrice === undefined) return [];
    const explicitlyRealized = finalPrice !== undefined || typeof raw.soldAt === 'string';
    return [
      {
        itemId: boundedIdentifier(raw.itemId),
        id: boundedIdentifier(raw.id),
        title: boundedString(raw.title ?? raw.shortDescription, 240),
        description: boundedString(raw.description ?? raw.longDescription, 2_000),
        endDate: boundedString(raw.endDate, 64),
        soldAt: boundedString(raw.soldAt, 64),
        finalPrice,
        buyNowPrice,
        price: normalizedPrice,
        priceKind: explicitlyRealized ? 'realized' : 'asking',
        marketState: explicitlyRealized ? 'sold' : 'active',
        url: safeTraderaUrl(raw.url ?? raw.itemLink),
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
  nowImpl = Date.now,
}) {
  const traderaCache = new Map();
  let traderaRequestStarts = [];

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
      const now = nowImpl();
      const cacheKey = `${payload.appId}:${payload.query.toLocaleLowerCase('sv-SE')}:${payload.limit}`;
      const cached = traderaCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return {
          configured: true,
          data: cached.data,
          cached: true,
          fetchedAt: cached.fetchedAt,
        };
      }

      traderaRequestStarts = traderaRequestStarts.filter(
        (startedAt) => now - startedAt < 86_400_000,
      );
      if (traderaRequestStarts.length >= TRADERA_DAILY_REQUEST_LIMIT) {
        throw Object.assign(new Error('Tradera daily request budget reached.'), {
          code: 'rate_limit',
        });
      }
      traderaRequestStarts.push(now);
      try {
        const url = new URL(TRADERA_SEARCH_URL);
        url.searchParams.set('query', payload.query);
        url.searchParams.set('pageNumber', '0');
        const response = await fetchImpl(url.toString(), {
          method: 'GET',
          redirect: 'error',
          signal: AbortSignal.timeout(TRADERA_TIMEOUT_MS),
          headers: {
            'X-App-Id': String(payload.appId),
            'X-App-Key': apiKey,
          },
        });
        if (!response.ok) {
          const error = new Error('Tradera request failed.');
          error.code =
            response.status === 401 || response.status === 403
              ? 'authentication'
              : response.status === 429
                ? 'rate_limit'
                : response.status >= 500
                  ? 'network'
                  : 'invalid_configuration';
          throw error;
        }
        const data = normalizeTraderaResponse(await readBoundedJson(response), payload.limit);
        const fetchedAt = new Date(now).toISOString();
        traderaCache.set(cacheKey, {
          data,
          fetchedAt,
          expiresAt: now + TRADERA_CACHE_TTL_MS,
        });
        return { configured: true, data, cached: false, fetchedAt };
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
