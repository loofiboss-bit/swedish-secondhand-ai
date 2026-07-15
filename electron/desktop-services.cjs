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
        return { configured: true, data: await response.json() };
      } catch (error) {
        if (!error.code) error.code = error instanceof TypeError ? 'network' : 'unknown';
        throw error;
      }
    },
  };
}

module.exports = { createDesktopServices, publicError };
