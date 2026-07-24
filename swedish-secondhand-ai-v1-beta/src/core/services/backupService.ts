import { delMany } from 'idb-keyval';
import packageMetadata from '../../../package.json';
import type { ComparableRecord, HistoryEntry, ListingDraft } from '@core/types';
import { isHistoryDataset } from './historyService';
import { isListingDraft, isListingDraftDataset } from './listingDraftService';
import { isManualComparableDataset } from './manualCompsService';
import {
  DATASET_KEYS,
  type DatasetId,
  readVersionedDataset,
  writeVersionedBatch,
} from './persistenceService';
import { isPersistedSettings, type PersistedSettings } from './settingsService';

export type BackupDatasetId = DatasetId;

export interface BackupFileV1 {
  formatVersion: 1;
  appVersion: string;
  exportedAt: string;
  datasets: {
    settings?: PersistedSettings;
    listingDraft?: ListingDraft | null;
    history?: HistoryEntry[];
    manualComparables?: ComparableRecord[];
  };
}

const BACKUP_FIELD_BY_DATASET: Record<DatasetId, keyof BackupFileV1['datasets']> = {
  settings: 'settings',
  'listing-draft': 'listingDraft',
  history: 'history',
  'manual-comparables': 'manualComparables',
};

const ALL_DATASETS = Object.keys(BACKUP_FIELD_BY_DATASET) as DatasetId[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsSecretField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => /secret|api.?key|authorization/i.test(key) || containsSecretField(nested),
  );
}

function publicSettings(settings: PersistedSettings | undefined): PersistedSettings | undefined {
  if (!settings) return undefined;
  const preferences = { ...settings };
  delete preferences.geminiApiKey;
  delete preferences.traderaApiKey;
  return preferences;
}

export function validateBackup(value: unknown): BackupFileV1 {
  if (!isRecord(value) || value.formatVersion !== 1) {
    throw new Error('Unsupported backup format.');
  }
  if (
    typeof value.appVersion !== 'string' ||
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    !isRecord(value.datasets) ||
    containsSecretField(value.datasets)
  ) {
    throw new Error('Backup metadata or datasets are invalid.');
  }

  const datasets = value.datasets;
  if (datasets.settings !== undefined && !isPersistedSettings(datasets.settings)) {
    throw new Error('Backup settings are invalid.');
  }
  if (
    datasets.listingDraft !== undefined &&
    datasets.listingDraft !== null &&
    !isListingDraft(datasets.listingDraft)
  ) {
    throw new Error('Backup draft is invalid.');
  }
  if (datasets.history !== undefined && !isHistoryDataset(datasets.history)) {
    throw new Error('Backup history is invalid.');
  }
  if (
    datasets.manualComparables !== undefined &&
    !isManualComparableDataset(datasets.manualComparables)
  ) {
    throw new Error('Backup manual comparables are invalid.');
  }

  return value as unknown as BackupFileV1;
}

class BackupService {
  async exportBackup(now = new Date()): Promise<BackupFileV1> {
    const settings = await readVersionedDataset('settings', isPersistedSettings, (legacy) => {
      if (!isPersistedSettings(legacy)) throw new Error('Settings data is corrupt.');
      return legacy;
    });
    const listingDraft = await readVersionedDataset(
      'listing-draft',
      isListingDraftDataset,
      (legacy) => {
        if (!isListingDraftDataset(legacy)) throw new Error('Draft data is corrupt.');
        return legacy;
      },
    );
    const history = await readVersionedDataset('history', isHistoryDataset, (legacy) => {
      if (!isHistoryDataset(legacy)) throw new Error('History data is corrupt.');
      return legacy;
    });
    const manualComparables = await readVersionedDataset(
      'manual-comparables',
      isManualComparableDataset,
      (legacy) => {
        if (!isManualComparableDataset(legacy)) throw new Error('Comparable data is corrupt.');
        return legacy;
      },
    );

    return {
      formatVersion: 1,
      appVersion: packageMetadata.version,
      exportedAt: now.toISOString(),
      datasets: {
        settings: publicSettings(settings),
        listingDraft: listingDraft ?? null,
        history: history ?? [],
        manualComparables: manualComparables ?? [],
      },
    };
  }

  async exportJson(now = new Date()): Promise<string> {
    return JSON.stringify(await this.exportBackup(now), null, 2);
  }

  async importBackup(
    value: string | unknown,
    selectedDatasets: DatasetId[] = ALL_DATASETS,
  ): Promise<void> {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const backup = validateBackup(parsed);
    const selected = new Set(selectedDatasets);
    const replacements: Partial<Record<DatasetId, unknown>> = {};

    for (const dataset of ALL_DATASETS) {
      if (!selected.has(dataset)) continue;
      const field = BACKUP_FIELD_BY_DATASET[dataset];
      const data = backup.datasets[field];
      if (data === undefined) continue;
      replacements[dataset] = data;
    }
    await writeVersionedBatch(replacements);
  }

  async reset(selectedDatasets: DatasetId[] = ALL_DATASETS): Promise<void> {
    await delMany(selectedDatasets.map((dataset) => DATASET_KEYS[dataset]));
  }
}

export const backupService = new BackupService();
