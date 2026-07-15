import { clear, get, set } from 'idb-keyval';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HistoryEntry, ListingDraft } from '@core/types';
import { backupService } from './backupService';
import { DATASET_KEYS, type DataEnvelope } from './persistenceService';

const draft = {
  version: 1,
  savedAt: '2026-07-15T10:00:00.000Z',
  currentStep: 'analyze',
  completedSteps: [],
  pricingStrategy: 'balanced',
  inputText: 'Chair',
  images: [],
  fingerprint: null,
  traderaComps: [],
  manualComps: [],
  valuation: null,
  templates: [],
} satisfies ListingDraft;

describe('backupService', () => {
  beforeEach(async () => clear());

  it('migrates bare v0.5 datasets to schema 2 and never exports secrets', async () => {
    await set(DATASET_KEYS.settings, {
      language: 'sv',
      geminiApiKey: 'legacy-secret',
      traderaApiKey: 'legacy-tradera',
    });
    await set(DATASET_KEYS['listing-draft'], draft);
    await set(DATASET_KEYS.history, []);
    await set(DATASET_KEYS['manual-comparables'], []);

    const backup = await backupService.exportBackup(new Date('2026-07-15T12:00:00.000Z'));
    const stored = await get<DataEnvelope<unknown>>(DATASET_KEYS['listing-draft']);

    expect(backup).toMatchObject({ formatVersion: 1, appVersion: '0.5.0' });
    expect(JSON.stringify(backup)).not.toContain('legacy-secret');
    expect(JSON.stringify(backup)).not.toMatch(/geminiApiKey|traderaApiKey/);
    expect(stored).toMatchObject({ schemaVersion: 2, dataset: 'listing-draft', data: draft });

    await clear();
    await backupService.importBackup(backup);
    expect(await get(DATASET_KEYS.settings)).toMatchObject({
      schemaVersion: 2,
      dataset: 'settings',
      data: { language: 'sv' },
    });
    expect(await get(DATASET_KEYS['listing-draft'])).toMatchObject({
      schemaVersion: 2,
      data: draft,
    });
    expect(await get(DATASET_KEYS.history)).toMatchObject({ schemaVersion: 2, data: [] });
    expect(await get(DATASET_KEYS['manual-comparables'])).toMatchObject({
      schemaVersion: 2,
      data: [],
    });
  });

  it('validates the complete import before changing any dataset', async () => {
    await set(DATASET_KEYS.history, {
      schemaVersion: 2,
      dataset: 'history',
      updatedAt: '',
      data: [],
    });
    const before = await get(DATASET_KEYS.history);
    const corrupt = {
      formatVersion: 1,
      appVersion: '1.0.0',
      exportedAt: '2026-07-15T12:00:00.000Z',
      datasets: { history: [], manualComparables: [{ id: 7 }] },
    };

    await expect(backupService.importBackup(corrupt)).rejects.toThrow(/manual comparables/i);
    expect(await get(DATASET_KEYS.history)).toEqual(before);
  });

  it('round-trips selected non-secret datasets atomically', async () => {
    const history: HistoryEntry[] = [];
    const backup = {
      formatVersion: 1 as const,
      appVersion: '1.0.0',
      exportedAt: '2026-07-15T12:00:00.000Z',
      datasets: { history, listingDraft: draft, manualComparables: [] },
    };

    await backupService.importBackup(backup, ['listing-draft']);

    expect(await get(DATASET_KEYS['listing-draft'])).toMatchObject({
      schemaVersion: 2,
      dataset: 'listing-draft',
      data: draft,
    });
    expect(await get(DATASET_KEYS.history)).toBeUndefined();
  });

  it('restores an explicitly empty draft as part of a full round trip', async () => {
    await backupService.importBackup({
      formatVersion: 1,
      appVersion: '1.0.0',
      exportedAt: '2026-07-15T12:00:00.000Z',
      datasets: { listingDraft: null },
    });

    expect(await get(DATASET_KEYS['listing-draft'])).toMatchObject({
      schemaVersion: 2,
      dataset: 'listing-draft',
      data: null,
    });
  });

  it('rejects unsupported formats and secret-bearing input', async () => {
    await expect(backupService.importBackup({ formatVersion: 2 })).rejects.toThrow(/unsupported/i);
    await expect(
      backupService.importBackup({
        formatVersion: 1,
        appVersion: '1.0.0',
        exportedAt: '2026-07-15T12:00:00.000Z',
        datasets: { settings: { geminiApiKey: 'secret' } },
      }),
    ).rejects.toThrow(/invalid/i);
  });
});
