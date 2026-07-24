const fs = require('node:fs/promises');
const path = require('node:path');

const SECRET_IDS = new Set(['gemini', 'tradera']);

function assertSecretId(secretId) {
  if (!SECRET_IDS.has(secretId)) {
    throw Object.assign(new Error('Unsupported secret identifier.'), { code: 'ipc_validation' });
  }
}

class SecretVault {
  constructor({ safeStorage, userDataPath }) {
    this.safeStorage = safeStorage;
    this.filePath = path.join(userDataPath, 'protected-secrets.json');
    this.pendingMutation = Promise.resolve();
  }

  async getStatus() {
    const document = await this.#readDocument();
    return {
      gemini: { configured: typeof document.secrets.gemini === 'string' },
      tradera: { configured: typeof document.secrets.tradera === 'string' },
      encryptionAvailable: this.#hasProtectedStorage(),
      backend:
        process.platform === 'linux' && this.safeStorage.getSelectedStorageBackend
          ? this.safeStorage.getSelectedStorageBackend()
          : undefined,
    };
  }

  async set(secretId, value) {
    assertSecretId(secretId);
    if (typeof value !== 'string' || !value.trim() || value.length > 8192) {
      throw Object.assign(new Error('Secret value is invalid.'), { code: 'ipc_validation' });
    }
    if (!this.#hasProtectedStorage()) {
      throw Object.assign(new Error('Protected OS storage is unavailable.'), {
        code: 'secure_storage_unavailable',
      });
    }

    return this.#mutate(async () => {
      const document = await this.#readDocument();
      const previous = document.secrets[secretId];
      const encrypted = this.safeStorage.encryptString(value.trim()).toString('base64');
      document.secrets[secretId] = encrypted;
      await this.#writeDocument(document);

      const verified = await this.read(secretId);
      if (verified !== value.trim()) {
        if (previous === undefined) delete document.secrets[secretId];
        else document.secrets[secretId] = previous;
        await this.#writeDocument(document);
        throw Object.assign(new Error('Protected secret verification failed.'), {
          code: 'secure_storage_verification',
        });
      }
      return this.getStatus();
    });
  }

  async delete(secretId) {
    assertSecretId(secretId);
    return this.#mutate(async () => {
      const document = await this.#readDocument();
      delete document.secrets[secretId];
      await this.#writeDocument(document);
      return this.getStatus();
    });
  }

  async read(secretId) {
    assertSecretId(secretId);
    const document = await this.#readDocument();
    const encoded = document.secrets[secretId];
    if (typeof encoded !== 'string') return null;
    if (!this.#hasProtectedStorage()) {
      throw Object.assign(new Error('Protected OS storage is unavailable.'), {
        code: 'secure_storage_unavailable',
      });
    }

    try {
      return this.safeStorage.decryptString(Buffer.from(encoded, 'base64'));
    } catch {
      throw Object.assign(new Error('Protected secret could not be decrypted.'), {
        code: 'secure_storage_corrupt',
      });
    }
  }

  #hasProtectedStorage() {
    if (!this.safeStorage.isEncryptionAvailable()) return false;
    return !(
      process.platform === 'linux' &&
      this.safeStorage.getSelectedStorageBackend?.() === 'basic_text'
    );
  }

  #mutate(operation) {
    const result = this.pendingMutation.then(operation);
    this.pendingMutation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async #readDocument() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
      if (parsed?.version !== 1 || typeof parsed.secrets !== 'object' || !parsed.secrets) {
        throw new Error('Invalid protected secret document.');
      }
      return parsed;
    } catch (error) {
      if (error?.code === 'ENOENT') return { version: 1, secrets: {} };
      throw Object.assign(new Error('Protected secret storage is corrupt.'), {
        code: 'secure_storage_corrupt',
      });
    }
  }

  async #writeDocument(document) {
    const directory = path.dirname(this.filePath);
    const temporaryPath = `${this.filePath}.tmp`;
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.writeFile(temporaryPath, `${JSON.stringify(document)}\n`, { mode: 0o600 });
    await fs.rename(temporaryPath, this.filePath);
  }
}

module.exports = { SecretVault, assertSecretId };
