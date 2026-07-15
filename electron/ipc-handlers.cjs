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

function registerIpcHandlers({ ipcMain, senderPolicy, vault, services }) {
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
    services.analyzeGemini(validateAnalysisRequest(payload)),
  );
  handle(CHANNELS.testGeminiConnection, (payload) =>
    services.testGeminiConnection(validateConnectionRequest(payload)),
  );
  handle(CHANNELS.traderaComparables, (payload) =>
    services.fetchTraderaComparables(validateComparableRequest(payload)),
  );
}

module.exports = { CHANNELS, registerIpcHandlers };
