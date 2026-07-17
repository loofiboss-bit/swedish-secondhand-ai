import { clear, get, set } from 'idb-keyval';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, it } from 'vitest';
import packageMetadata from '../../../package.json';
import type { HistoryEntry, ListingDraft } from '@core/types';
import { backupService, isBackupTextWithinLimit } from './backupService';
import { DATASET_KEYS, createEnvelope, type DataEnvelope } from './persistenceService';
import { PROJECT_STORE, projectRepository } from './projectRepository';

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
  beforeEach(async () => {
    Object.defineProperty(globalThis, 'Blob', { configurable: true, value: NodeBlob });
    await clear();
    await clear(PROJECT_STORE);
  });

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

    expect(backup).toMatchObject({ formatVersion: 3, appVersion: packageMetadata.version });
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
    await expect(backupService.importBackup({ formatVersion: 7 })).rejects.toThrow(/unsupported/i);
    await expect(
      backupService.importBackup({
        formatVersion: 1,
        appVersion: '1.0.0',
        exportedAt: '2026-07-15T12:00:00.000Z',
        datasets: { settings: { geminiApiKey: 'secret' } },
      }),
    ).rejects.toThrow(/invalid/i);
  });

  it('measures backup text bytes before parsing it', () => {
    expect(isBackupTextWithinLimit('1234567890', 10)).toBe(true);
    expect(isBackupTextWithinLimit('å'.repeat(6), 10)).toBe(false);
  });

  it('round-trips full project backups and makes compact image omission explicit', async () => {
    await projectRepository.initialize();
    const created = await projectRepository.create();
    await projectRepository.save(created.project.id, {
      ...created.draft,
      inputText: 'Project with photo',
      images: ['data:image/png;base64,AQID'],
    });

    const full = await backupService.exportBackup(new Date('2026-07-16T12:00:00.000Z'), true);
    const compact = await backupService.exportBackup(new Date('2026-07-16T12:00:00.000Z'), false);

    expect(full.datasets.projects).toMatchObject({ imagesIncluded: true });
    expect(full.datasets.projects?.records[0]?.images).toEqual(['data:image/png;base64,AQID']);
    expect(compact.datasets.projects).toMatchObject({ imagesIncluded: false });
    expect(compact.datasets.projects?.records[0]?.images).toEqual([]);
    expect(compact.datasets.projects?.records[0]?.project.workspace.mediaIds).toEqual([]);

    await projectRepository.reset();
    await backupService.importBackup(full, ['projects']);
    const restored = await projectRepository.open(created.project.id);
    expect(restored.draft.inputText).toBe('Project with photo');
    expect(restored.draft.images).toEqual(['data:image/png;base64,AQID']);
  });

  it('rolls legacy datasets back when project replacement cannot commit', async () => {
    await set(DATASET_KEYS.history, createEnvelope('history', []));
    const before = await get(DATASET_KEYS.history);
    await set('meta:project-index-v4', { schemaVersion: 99 }, PROJECT_STORE);
    const replacement = {
      formatVersion: 2 as const,
      appVersion: '2.0.0-beta.1',
      exportedAt: '2026-07-16T12:00:00.000Z',
      datasets: {
        history: [
          {
            id: 'replacement',
            createdAt: '2026-07-16T10:00:00.000Z',
            fingerprint: {
              title: 'Chair',
              category: 'Furniture',
              brand: 'IKEA',
              model: 'Poang',
              conditionGrade: 'good' as const,
              attributes: {},
              detectedLanguage: 'sv' as const,
              confidence: 0.8,
            },
            valuation: {
              status: 'insufficient-evidence' as const,
              priceMinSek: null,
              priceRecommendedSek: null,
              priceMaxSek: null,
              confidence: 0,
              rationale: 'No evidence',
              action: 'Add evidence',
              pricingStrategy: 'balanced' as const,
              confidenceBreakdown: {
                similarity: 0,
                sampleSize: 0,
                sourceQuality: 0,
                calibration: 1,
              },
              compsUsed: [],
              adjustments: [],
            },
            templates: [],
            saleStatus: 'pending' as const,
          },
        ],
        projects: {
          schemaVersion: 3 as const,
          activeProjectId: null,
          imagesIncluded: true,
          records: [],
        },
      },
    };

    await expect(backupService.importBackup(replacement, ['history', 'projects'])).rejects.toThrow(
      /project index/i,
    );
    expect(await get(DATASET_KEYS.history)).toEqual(before);
  });
});
