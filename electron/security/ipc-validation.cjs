const MAX_TEXT_LENGTH = 20_000;
const MAX_IMAGE_LENGTH = 14_000_000;
const MAX_TOTAL_IMAGE_LENGTH = 30_000_000;
const { fileURLToPath } = require('node:url');

function validationError(message) {
  return Object.assign(new Error(message), { code: 'ipc_validation' });
}

function assertTrustedSender(event, { isDev, productionIndexPath }) {
  if (!event?.senderFrame || event.senderFrame !== event.sender?.mainFrame) {
    throw validationError('IPC request must originate from the main application frame.');
  }
  const url = event.senderFrame.url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw validationError('IPC sender URL is invalid.');
  }
  const trusted = isDev
    ? parsed.origin === 'http://127.0.0.1:5173' && parsed.pathname === '/'
    : parsed.protocol === 'file:' && fileURLToPath(parsed) === productionIndexPath;
  if (!trusted) throw validationError('IPC sender is not trusted.');
}

function assertRecord(value, message = 'IPC payload must be an object.') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw validationError(message);
  }
  return value;
}

function validateSecretUpdate(value) {
  const payload = assertRecord(value);
  if (!['gemini', 'tradera'].includes(payload.secretId)) {
    throw validationError('Unsupported secret identifier.');
  }
  if (typeof payload.value !== 'string' || !payload.value.trim() || payload.value.length > 8192) {
    throw validationError('Secret value is invalid.');
  }
  return { secretId: payload.secretId, value: payload.value };
}

function validateSecretDelete(value) {
  const payload = assertRecord(value);
  if (!['gemini', 'tradera'].includes(payload.secretId)) {
    throw validationError('Unsupported secret identifier.');
  }
  return { secretId: payload.secretId };
}

function validateAnalysisRequest(value) {
  const payload = assertRecord(value);
  if (
    typeof payload.prompt !== 'string' ||
    !payload.prompt ||
    payload.prompt.length > MAX_TEXT_LENGTH
  ) {
    throw validationError('Analysis prompt is invalid.');
  }
  if (!Array.isArray(payload.images) || payload.images.length > 6) {
    throw validationError('Analysis images are invalid.');
  }
  let totalLength = 0;
  const images = payload.images.map((image) => {
    if (
      typeof image !== 'string' ||
      !/^data:image\/[a-z0-9.+-]+;base64,/i.test(image) ||
      image.length > MAX_IMAGE_LENGTH
    ) {
      throw validationError('Analysis image is invalid.');
    }
    totalLength += image.length;
    return image;
  });
  if (totalLength > MAX_TOTAL_IMAGE_LENGTH) {
    throw validationError('Combined analysis images are too large.');
  }
  if (payload.language !== undefined && !['sv', 'en'].includes(payload.language)) {
    throw validationError('Analysis language is invalid.');
  }
  if (
    typeof payload.modelId !== 'string' ||
    !payload.modelId.trim() ||
    payload.modelId.length > 160
  ) {
    throw validationError('Analysis model is invalid.');
  }
  return {
    prompt: payload.prompt,
    images,
    language: payload.language,
    modelId: payload.modelId.trim(),
  };
}

function validateConnectionRequest(value) {
  const payload = assertRecord(value);
  if (
    typeof payload.modelId !== 'string' ||
    !payload.modelId.trim() ||
    payload.modelId.length > 160
  ) {
    throw validationError('Connection-test model is invalid.');
  }
  return { modelId: payload.modelId.trim() };
}

function validateComparableRequest(value) {
  const payload = assertRecord(value);
  if (!Number.isSafeInteger(payload.appId) || payload.appId <= 0) {
    throw validationError('Tradera app ID is invalid.');
  }
  if (typeof payload.query !== 'string' || !payload.query.trim() || payload.query.length > 500) {
    throw validationError('Comparable query is invalid.');
  }
  const limit = Number.isInteger(payload.limit) ? payload.limit : 20;
  if (limit < 1 || limit > 50) throw validationError('Comparable limit is invalid.');
  return {
    appId: payload.appId,
    query: payload.query.trim(),
    limit,
  };
}

module.exports = {
  assertTrustedSender,
  validateAnalysisRequest,
  validateComparableRequest,
  validateConnectionRequest,
  validateSecretDelete,
  validateSecretUpdate,
};
