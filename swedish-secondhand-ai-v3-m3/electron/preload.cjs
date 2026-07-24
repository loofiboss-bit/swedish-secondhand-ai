const { contextBridge, ipcRenderer } = require('electron');

async function invoke(channel, payload) {
  const result = await ipcRenderer.invoke(channel, payload);
  if (!result?.ok) {
    const error = new Error(result?.error?.message || 'Desktop operation failed.');
    error.code = result?.error?.code || 'unknown';
    throw error;
  }
  return result.value;
}

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  secrets: {
    getStatus: () => invoke('secrets:status'),
    update: (secretId, value) => invoke('secrets:update', { secretId, value }),
    delete: (secretId) => invoke('secrets:delete', { secretId }),
  },
  ai: {
    analyzeGemini: (request) => invoke('ai:gemini-analyze', request),
    testGeminiConnection: (modelId) => invoke('ai:gemini-test-connection', { modelId }),
  },
  marketplace: {
    fetchTraderaComparables: (request) => invoke('marketplace:tradera-comparables', request),
  },
});
