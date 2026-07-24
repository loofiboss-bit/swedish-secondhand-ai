import { get, set, setMany } from 'idb-keyval';

export const DATA_SCHEMA_VERSION = 2;

export type DatasetId = 'settings' | 'listing-draft' | 'history' | 'manual-comparables';

export const DATASET_KEYS: Record<DatasetId, string> = {
  settings: 'swedish-secondhand-ai:settings',
  'listing-draft': 'swedish-secondhand-ai:listing-draft',
  history: 'swedish-secondhand-ai:history',
  'manual-comparables': 'swedish-secondhand-ai:manual-comps',
};

export interface DataEnvelope<T> {
  schemaVersion: 2;
  dataset: DatasetId;
  updatedAt: string;
  data: T;
}

export class PersistedDataError extends Error {
  readonly code: 'corrupt' | 'unsupported';

  constructor(code: PersistedDataError['code'], message: string) {
    super(message);
    this.name = 'PersistedDataError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createEnvelope<T>(dataset: DatasetId, data: T): DataEnvelope<T> {
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    dataset,
    updatedAt: new Date().toISOString(),
    data,
  };
}

export function normalizeStoredDataset<T>(
  raw: unknown,
  dataset: DatasetId,
  validate: (value: unknown) => value is T,
  migrateLegacy: (value: unknown) => T,
): { data: T; migrated: boolean } {
  if (isRecord(raw) && 'dataset' in raw && 'data' in raw) {
    if (raw.schemaVersion !== DATA_SCHEMA_VERSION) {
      throw new PersistedDataError('unsupported', `Unsupported ${dataset} schema version.`);
    }
    if (raw.dataset !== dataset || !validate(raw.data)) {
      throw new PersistedDataError('corrupt', `Invalid ${dataset} envelope.`);
    }
    return { data: raw.data, migrated: false };
  }

  const legacyData = isRecord(raw) && raw.schemaVersion === 1 && 'data' in raw ? raw.data : raw;
  const migrated = migrateLegacy(legacyData);
  if (!validate(migrated)) {
    throw new PersistedDataError('corrupt', `Legacy ${dataset} data could not be migrated.`);
  }
  return { data: migrated, migrated: true };
}

export async function readVersionedDataset<T>(
  dataset: DatasetId,
  validate: (value: unknown) => value is T,
  migrateLegacy: (value: unknown) => T,
): Promise<T | undefined> {
  const raw = await get<unknown>(DATASET_KEYS[dataset]);
  if (raw === undefined) return undefined;
  const normalized = normalizeStoredDataset(raw, dataset, validate, migrateLegacy);
  if (normalized.migrated) {
    await set(DATASET_KEYS[dataset], createEnvelope(dataset, normalized.data));
  }
  return normalized.data;
}

export async function writeVersionedDataset<T>(dataset: DatasetId, data: T): Promise<void> {
  await set(DATASET_KEYS[dataset], createEnvelope(dataset, data));
}

export async function writeVersionedBatch(
  datasets: Partial<Record<DatasetId, unknown>>,
): Promise<void> {
  const entries = Object.entries(datasets).map(([dataset, data]) => [
    DATASET_KEYS[dataset as DatasetId],
    createEnvelope(dataset as DatasetId, data),
  ]) as Array<[IDBValidKey, unknown]>;
  await setMany(entries);
}
