const {
  assertTrustedSender,
  validateAnalysisRequest,
  validateComparableRequest,
  validateConnectionRequest,
  validateSecretDelete,
  validateSecretUpdate,
} = require('./security/ipc-validation.cjs');
const { publicError } = require('./desktop-services.cjs');

const CHANNELS = Object.freeze({
  secretStatus: 'secrets:status',
  secretUpdate: 'secrets:update',
  secretDelete: 'secrets:delete',
  analyzeGemini: 'ai:gemini-analyze',
  testGeminiConnection: 'ai:gemini-test-connection',
  traderaComparables: 'marketplace:tradera-comparables',
});

function operationGate({ maxConcurrent, maxPerWindow, windowMs }) {
  let active = 0;
  let starts = [];
  return async (operation) => {
    const now = Date.now();
    starts = starts.filter((startedAt) => now - startedAt < windowMs);
    if (active >= maxConcurrent || starts.length >= maxPerWindow) {
      throw Object.assign(new Error('Desktop operation rate limit exceeded.'), {
        code: 'rate_limit',
      });
    }
    starts.push(now);
    active += 1;
    try {
      return await operation();
    } finally {
      active -= 1;
    }
  };
}

function registerIpcHandlers({ ipcMain, senderPolicy, vault, services }) {
  const analyzeGate = operationGate({ maxConcurrent: 2, maxPerWindow: 12, windowMs: 60_000 });
  const connectionGate = operationGate({ maxConcurrent: 1, maxPerWindow: 6, windowMs: 60_000 });
  const marketplaceGate = operationGate({ maxConcurrent: 2, maxPerWindow: 20, windowMs: 60_000 });
  const handle = (channel, operation) => {
    ipcMain.handle(channel, async (event, payload) => {
      try {
        assertTrustedSender(event, senderPolicy);
        return { ok: true, value: await operation(payload) };
      } catch (error) {
        return { ok: false, error: publicError(error) };
      }
    });
  };

  handle(CHANNELS.secretStatus, () => vault.getStatus());
  handle(CHANNELS.secretUpdate, (payload) => {
    const validated = validateSecretUpdate(payload);
    return vault.set(validated.secretId, validated.value);
  });
  handle(CHANNELS.secretDelete, (payload) => {
    const validated = validateSecretDelete(payload);
    return vault.delete(validated.secretId);
  });
  handle(CHANNELS.analyzeGemini, (payload) =>
    analyzeGate(() => services.analyzeGemini(validateAnalysisRequest(payload))),
  );
  handle(CHANNELS.testGeminiConnection, (payload) =>
    connectionGate(() => services.testGeminiConnection(validateConnectionRequest(payload))),
  );
  handle(CHANNELS.traderaComparables, (payload) =>
    marketplaceGate(() => services.fetchTraderaComparables(validateComparableRequest(payload))),
  );
}

module.exports = { CHANNELS, operationGate, registerIpcHandlers };
