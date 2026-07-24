import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { SecretVault } = require('./security/secret-vault.cjs') as {
  SecretVault: new (options: { safeStorage: SafeStorageStub; userDataPath: string }) => SecretVault;
};
const { assertTrustedSender, validateAnalysisRequest, validateSecretUpdate } =
  require('./security/ipc-validation.cjs') as {
    assertTrustedSender: (
      event: unknown,
      policy: { isDev: boolean; productionIndexPath: string },
    ) => void;
    validateAnalysisRequest: (payload: unknown) => unknown;
    validateSecretUpdate: (payload: unknown) => unknown;
  };

interface SafeStorageStub {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
  getSelectedStorageBackend(): string;
}

interface SecretVault {
  getStatus(): Promise<unknown>;
  set(secretId: string, value: string): Promise<unknown>;
  read(secretId: string): Promise<string | null>;
  delete(secretId: string): Promise<unknown>;
}

const temporaryDirectories: string[] = [];

async function createVault(overrides: Partial<SafeStorageStub> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'secondhand-vault-'));
  temporaryDirectories.push(directory);
  const safeStorage: SafeStorageStub = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`encrypted:${value}`),
    decryptString: (value) => value.toString().replace(/^encrypted:/, ''),
    getSelectedStorageBackend: () => 'kwallet6',
    ...overrides,
  };
  return {
    directory,
    safeStorage,
    vault: new SecretVault({ safeStorage, userDataPath: directory }),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('SecretVault', () => {
  it('encrypts, verifies, reports and deletes secrets without writing plaintext', async () => {
    const { directory, vault } = await createVault();

    await vault.set('gemini', 'secret-value');

    expect(await vault.read('gemini')).toBe('secret-value');
    expect(await vault.getStatus()).toMatchObject({
      gemini: { configured: true },
      tradera: { configured: false },
      encryptionAvailable: true,
    });
    const disk = await readFile(join(directory, 'protected-secrets.json'), 'utf8');
    expect(disk).not.toContain('secret-value');
    expect(disk).toContain(Buffer.from('encrypted:secret-value').toString('base64'));

    await vault.delete('gemini');
    expect(await vault.read('gemini')).toBeNull();
  });

  it('refuses writes when protected OS storage is unavailable', async () => {
    const { vault } = await createVault({ isEncryptionAvailable: () => false });

    await expect(vault.set('gemini', 'secret-value')).rejects.toMatchObject({
      code: 'secure_storage_unavailable',
    });
  });

  it('refuses Linux basic_text because it does not protect secrets', async () => {
    const { vault } = await createVault({ getSelectedStorageBackend: () => 'basic_text' });

    await expect(vault.set('gemini', 'secret-value')).rejects.toMatchObject({
      code: 'secure_storage_unavailable',
    });
    expect(await vault.getStatus()).toMatchObject({
      encryptionAvailable: false,
      backend: 'basic_text',
    });
  });

  it('does not replace a secret when verification fails', async () => {
    const { safeStorage, vault } = await createVault();
    await vault.set('gemini', 'existing-value');
    safeStorage.decryptString = () => 'different-value';

    await expect(vault.set('gemini', 'replacement-value')).rejects.toMatchObject({
      code: 'secure_storage_verification',
    });
    safeStorage.decryptString = (value) => value.toString().replace(/^encrypted:/, '');
    expect(await vault.read('gemini')).toBe('existing-value');
  });

  it('serializes concurrent writes so one provider secret cannot overwrite another', async () => {
    const { vault } = await createVault();

    await Promise.all([vault.set('gemini', 'gemini-value'), vault.set('tradera', 'tradera-value')]);

    expect(await vault.read('gemini')).toBe('gemini-value');
    expect(await vault.read('tradera')).toBe('tradera-value');
  });
});

describe('IPC validation', () => {
  it('accepts the main development frame and rejects unexpected frames', () => {
    const mainFrame = { url: 'http://127.0.0.1:5173/' };
    expect(() =>
      assertTrustedSender(
        { senderFrame: mainFrame, sender: { mainFrame } },
        { isDev: true, productionIndexPath: '' },
      ),
    ).not.toThrow();
    expect(() =>
      assertTrustedSender(
        {
          senderFrame: { url: 'https://attacker.example/' },
          sender: { mainFrame: { url: 'https://attacker.example/' } },
        },
        { isDev: true, productionIndexPath: '' },
      ),
    ).toThrow(/main application frame|not trusted/i);

    const deceptiveFrame = { url: 'http://127.0.0.1.attacker.example:5173/' };
    expect(() =>
      assertTrustedSender(
        { senderFrame: deceptiveFrame, sender: { mainFrame: deceptiveFrame } },
        { isDev: true, productionIndexPath: '' },
      ),
    ).toThrow(/not trusted/i);
  });

  it('rejects invalid secret and oversized analysis payloads', () => {
    expect(() => validateSecretUpdate({ secretId: 'unknown', value: 'secret' })).toThrow();
    expect(() =>
      validateAnalysisRequest({
        prompt: 'Analyze item',
        images: Array.from({ length: 7 }, () => 'data:image/jpeg;base64,AAA'),
        modelId: 'gemini-test',
      }),
    ).toThrow(/images/i);
  });

  it('accepts bounded typed analysis payloads', () => {
    expect(
      validateAnalysisRequest({
        prompt: 'Analyze item',
        images: ['data:image/jpeg;base64,AAA'],
        language: 'sv',
        modelId: 'gemini-test',
      }),
    ).toEqual({
      prompt: 'Analyze item',
      images: ['data:image/jpeg;base64,AAA'],
      language: 'sv',
      modelId: 'gemini-test',
    });
  });
});
