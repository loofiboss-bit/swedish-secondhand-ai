import { clear, get, set } from 'idb-keyval';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATASET_KEYS, PersistedDataError, readVersionedDataset } from './persistenceService';

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

describe('versioned persistence', () => {
  beforeEach(async () => clear());

  it('migrates a bare schema-1 payload once and then reads idempotently', async () => {
    await set(DATASET_KEYS.history, ['legacy']);

    await expect(
      readVersionedDataset('history', isStringArray, (legacy) => {
        if (!isStringArray(legacy)) throw new Error('invalid');
        return legacy;
      }),
    ).resolves.toEqual(['legacy']);
    const firstEnvelope = await get(DATASET_KEYS.history);

    await expect(
      readVersionedDataset('history', isStringArray, () => {
        throw new Error('migration must not run twice');
      }),
    ).resolves.toEqual(['legacy']);
    expect(await get(DATASET_KEYS.history)).toEqual(firstEnvelope);
  });

  it('leaves corrupt and unsupported envelopes untouched', async () => {
    const corrupt = { schemaVersion: 2, dataset: 'history', updatedAt: '', data: [7] };
    await set(DATASET_KEYS.history, corrupt);
    await expect(readVersionedDataset('history', isStringArray, () => [])).rejects.toMatchObject({
      code: 'corrupt',
    } satisfies Partial<PersistedDataError>);
    expect(await get(DATASET_KEYS.history)).toEqual(corrupt);

    const unsupported = { schemaVersion: 3, dataset: 'history', updatedAt: '', data: [] };
    await set(DATASET_KEYS.history, unsupported);
    await expect(readVersionedDataset('history', isStringArray, () => [])).rejects.toMatchObject({
      code: 'unsupported',
    } satisfies Partial<PersistedDataError>);
    expect(await get(DATASET_KEYS.history)).toEqual(unsupported);
  });
});
