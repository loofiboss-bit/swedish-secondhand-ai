import { delMany, getMany, setMany } from 'idb-keyval';
import packageMetadata from '../../../package.json';
import type { ComparableRecord, HistoryEntry, ListingDraft } from '@core/types';
import { isHistoryDataset } from './historyService';
import { isListingDraft, isListingDraftDataset } from './listingDraftService';
import { isManualComparableDataset } from './manualCompsService';
import {
  isProjectBackupDataset,
  projectRepository,
  type ProjectBackupDataset,
} from './projectRepository';
import {
  DATASET_KEYS,
  type DatasetId,
  readVersionedDataset,
  writeVersionedBatch,
} from './persistenceService';
import { isPersistedSettings, type PersistedSettings } from './settingsService';

export type BackupDatasetId = DatasetId | 'projects';

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

export interface BackupFileV2 {
  formatVersion: 2;
  appVersion: string;
  exportedAt: string;
  datasets: BackupFileV1['datasets'] & {
    projects?: ProjectBackupDataset;
  };
}

export type BackupFile = BackupFileV1 | BackupFileV2;

const BACKUP_FIELD_BY_DATASET: Record<DatasetId, keyof BackupFileV1['datasets']> = {
  settings: 'settings',
  'listing-draft': 'listingDraft',
  history: 'history',
  'manual-comparables': 'manualComparables',
};

const ALL_DATASETS = Object.keys(BACKUP_FIELD_BY_DATASET) as DatasetId[];
export const MAX_BACKUP_BYTES = 512 * 1024 * 1024;

export function isBackupTextWithinLimit(value: string, maxBytes = MAX_BACKUP_BYTES): boolean {
  if (value.length > maxBytes) return false;
  return new TextEncoder().encode(value).byteLength <= maxBytes;
}

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

export function validateBackup(value: unknown): BackupFile {
  if (!isRecord(value) || (value.formatVersion !== 1 && value.formatVersion !== 2)) {
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
  if (
    value.formatVersion === 2 &&
    datasets.projects !== undefined &&
    !isProjectBackupDataset(datasets.projects)
  ) {
    throw new Error('Backup projects are invalid.');
  }

  return value as unknown as BackupFile;
}

class BackupService {
  async exportBackup(now = new Date(), includeProjectImages = true): Promise<BackupFileV2> {
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
    const projects = await projectRepository.exportBackup(includeProjectImages);

    return {
      formatVersion: 2,
      appVersion: packageMetadata.version,
      exportedAt: now.toISOString(),
      datasets: {
        settings: publicSettings(settings),
        listingDraft: listingDraft ?? null,
        history: history ?? [],
        manualComparables: manualComparables ?? [],
        projects,
      },
    };
  }

  async exportJson(now = new Date(), includeProjectImages = true): Promise<string> {
    return JSON.stringify(await this.exportBackup(now, includeProjectImages), null, 2);
  }

  async importBackup(
    value: string | unknown,
    selectedDatasets: BackupDatasetId[] = [...ALL_DATASETS, 'projects'],
  ): Promise<void> {
    if (typeof value === 'string' && !isBackupTextWithinLimit(value)) {
      throw new Error('Backup exceeds the local import size limit.');
    }
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
    const projectReplacement =
      selected.has('projects') && backup.formatVersion === 2 ? backup.datasets.projects : undefined;
    const replacementDatasets = Object.keys(replacements) as DatasetId[];
    const replacementKeys = replacementDatasets.map((dataset) => DATASET_KEYS[dataset]);
    const previousValues = await getMany<unknown>(replacementKeys);
    await writeVersionedBatch(replacements);
    try {
      if (projectReplacement !== undefined) {
        await projectRepository.importBackup(projectReplacement);
      }
    } catch (error) {
      const restoreEntries: Array<[IDBValidKey, unknown]> = replacementKeys.flatMap((key, index) =>
        previousValues[index] === undefined
          ? []
          : ([[key, previousValues[index]]] as Array<[IDBValidKey, unknown]>),
      );
      const deleteKeys = replacementKeys.filter((_, index) => previousValues[index] === undefined);
      if (restoreEntries.length > 0) await setMany(restoreEntries);
      if (deleteKeys.length > 0) await delMany(deleteKeys);
      throw error;
    }
  }

  async reset(selectedDatasets: BackupDatasetId[] = [...ALL_DATASETS, 'projects']): Promise<void> {
    const legacy = selectedDatasets.filter(
      (dataset): dataset is DatasetId => dataset !== 'projects',
    );
    await delMany(legacy.map((dataset) => DATASET_KEYS[dataset]));
    if (selectedDatasets.includes('projects')) await projectRepository.reset();
  }
}

export const backupService = new BackupService();
