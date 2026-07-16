import { createStore, get, setMany } from 'idb-keyval';
import type {
  HistoryEntry,
  ItemProject,
  ListingDraft,
  MediaAsset,
  ProjectSection,
  ProjectStatus,
  ProjectSummary,
} from '@core/types';
import { historyService } from './historyService';
import { isListingDraft, listingDraftService } from './listingDraftService';
import { DATASET_KEYS } from './persistenceService';
import { factsFromFingerprint } from './verifiedFactsService';

const PROJECT_DB = 'swedish-secondhand-ai-v2';
const PROJECT_STORE = createStore(PROJECT_DB, 'project-records');
const INDEX_KEY = 'meta:project-index';
const PROJECT_KEY_PREFIX = 'project:';
const PROJECT_SCHEMA_VERSION = 3;

interface ProjectRecord {
  schemaVersion: 3;
  project: ItemProject;
  media: MediaAsset[];
}

interface ProjectIndex {
  schemaVersion: 3;
  activeProjectId: string | null;
  projectIds: string[];
  migrationCompletedAt: string;
}

export interface ProjectRepositoryState {
  status: 'ready' | 'recovery';
  activeProjectId: string | null;
  projects: ProjectSummary[];
  error?: string;
}

export interface HydratedProject {
  project: ItemProject;
  draft: ListingDraft;
}

export interface ProjectBackupRecord {
  project: ItemProject;
  images: string[];
}

export interface ProjectBackupDataset {
  schemaVersion: 3;
  activeProjectId: string | null;
  imagesIncluded: boolean;
  records: ProjectBackupRecord[];
}

function projectKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProjectIndex(value: unknown): value is ProjectIndex {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === PROJECT_SCHEMA_VERSION &&
    (typeof value.activeProjectId === 'string' || value.activeProjectId === null) &&
    Array.isArray(value.projectIds) &&
    value.projectIds.every((id) => typeof id === 'string') &&
    typeof value.migrationCompletedAt === 'string'
  );
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return ['draft', 'ready', 'listed', 'sold', 'paused'].includes(String(value));
}

function isProjectSection(value: unknown): value is ProjectSection {
  return ['item', 'market', 'listing', 'follow-up'].includes(String(value));
}

function isItemProject(value: unknown): value is ItemProject {
  if (!isRecord(value) || !isRecord(value.workspace)) return false;
  const workspace = value.workspace;
  return (
    value.schemaVersion === PROJECT_SCHEMA_VERSION &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    isProjectStatus(value.status) &&
    isProjectSection(value.currentSection) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    Array.isArray(workspace.mediaIds) &&
    workspace.mediaIds.every((id) => typeof id === 'string') &&
    isListingDraft({ ...workspace, images: [] })
  );
}

function isProjectRecord(value: unknown): value is ProjectRecord {
  if (!isRecord(value) || value.schemaVersion !== PROJECT_SCHEMA_VERSION) return false;
  if (!isItemProject(value.project) || !Array.isArray(value.media)) return false;
  const project = value.project;
  const media = value.media as unknown[];
  if (
    !media.every(
      (asset) =>
        isRecord(asset) &&
        asset.version === 1 &&
        typeof asset.id === 'string' &&
        asset.projectId === project.id &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(String(asset.mimeType)) &&
        typeof asset.size === 'number' &&
        Number.isFinite(asset.size) &&
        asset.size >= 0 &&
        asset.size <= 10 * 1024 * 1024 &&
        typeof asset.contentHash === 'string' &&
        typeof asset.blob === 'object' &&
        asset.blob !== null,
    )
  ) {
    return false;
  }
  const mediaIds = new Set((media as Array<{ id: string }>).map((asset) => asset.id));
  return (
    mediaIds.size === media.length &&
    project.workspace.mediaIds.length === media.length &&
    project.workspace.mediaIds.every((id) => mediaIds.has(id))
  );
}

export function isProjectBackupDataset(value: unknown): value is ProjectBackupDataset {
  if (!isRecord(value) || value.schemaVersion !== PROJECT_SCHEMA_VERSION) return false;
  if (
    (typeof value.activeProjectId !== 'string' && value.activeProjectId !== null) ||
    typeof value.imagesIncluded !== 'boolean' ||
    !Array.isArray(value.records)
  ) {
    return false;
  }
  const ids = new Set<string>();
  for (const entry of value.records) {
    if (!isRecord(entry) || !isRecord(entry.project) || !Array.isArray(entry.images)) return false;
    if (!isItemProject(entry.project)) return false;
    const project = entry.project;
    const id = project.id;
    if (ids.has(id)) return false;
    ids.add(id);
    if (
      !entry.images.every(
        (image) =>
          typeof image === 'string' && /^data:image\/(?:jpeg|png|webp);base64,/i.test(image),
      )
    ) {
      return false;
    }
    if (value.imagesIncluded && entry.images.length !== project.workspace.mediaIds.length) {
      return false;
    }
    if (!value.imagesIncluded && entry.images.length !== 0) return false;
  }
  return value.activeProjectId === null || ids.has(value.activeProjectId);
}

function emptyDraft(now = new Date().toISOString()): ListingDraft {
  return {
    version: 1,
    savedAt: now,
    currentStep: 'analyze',
    completedSteps: [],
    pricingStrategy: 'balanced',
    inputText: '',
    images: [],
    fingerprint: null,
    productFacts: null,
    traderaComps: [],
    manualComps: [],
    valuation: null,
    templates: [],
  };
}

function titleFromDraft(draft: ListingDraft): string {
  return (
    draft.productFacts?.title.value.trim() ||
    draft.fingerprint?.title.trim() ||
    draft.inputText.trim().slice(0, 80) ||
    'Namnlös vara'
  );
}

function statusFromDraft(draft: ListingDraft, current?: ProjectStatus): ProjectStatus {
  if (current && ['listed', 'sold', 'paused'].includes(current)) return current;
  return draft.templates.length > 0 && draft.valuation?.status !== 'insufficient-evidence'
    ? 'ready'
    : 'draft';
}

function sectionFromDraft(draft: ListingDraft): ProjectSection {
  if (draft.currentStep === 'comparables' || draft.currentStep === 'price') return 'market';
  if (draft.currentStep === 'templates') return 'listing';
  if (draft.currentStep === 'review') return 'follow-up';
  return 'item';
}

function summary(record: ProjectRecord): ProjectSummary {
  const valuation = record.project.workspace.valuation;
  return {
    id: record.project.id,
    title: record.project.title,
    status: record.project.status,
    updatedAt: record.project.updatedAt,
    recommendedPriceSek:
      valuation && valuation.status !== 'insufficient-evidence'
        ? valuation.priceRecommendedSek
        : null,
    thumbnailMediaId: record.project.workspace.mediaIds[0],
  };
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function dataUrlToMedia(
  dataUrl: string,
  projectId: string,
  index: number,
  now: string,
): MediaAsset {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
  if (!match) throw new Error('Unsupported project image data.');
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Project image is too large.');
  const contentHash = hash(dataUrl);
  return {
    version: 1,
    id: `${projectId}:media:${index}:${contentHash}`,
    projectId,
    mimeType: match[1] as MediaAsset['mimeType'],
    size: bytes.byteLength,
    createdAt: now,
    contentHash,
    blob: new Blob([bytes], { type: match[1] }),
  };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof blob.arrayBuffer === 'function') {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of buffer) binary += String.fromCharCode(byte);
    return `data:${blob.type};base64,${btoa(binary)}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Project image could not be read.'));
    reader.readAsDataURL(blob);
  });
}

function recordFromDraft(
  id: string,
  draft: ListingDraft,
  options: {
    status?: ProjectStatus;
    createdAt?: string;
    current?: ProjectRecord;
    migratedFrom?: ItemProject['migratedFrom'];
    outcome?: ItemProject['outcome'];
  } = {},
): ProjectRecord {
  const now = new Date().toISOString();
  const { images, ...workspace } = draft;
  if (images.length > 6) throw new Error('A project can contain at most six images.');
  const media = images.map((image, index) => dataUrlToMedia(image, id, index, now));
  const project: ItemProject = {
    schemaVersion: 3,
    id,
    title: titleFromDraft(draft),
    status: options.status ?? statusFromDraft(draft, options.current?.project.status),
    currentSection: options.current?.project.currentSection ?? sectionFromDraft(draft),
    createdAt: options.createdAt ?? options.current?.project.createdAt ?? now,
    updatedAt: now,
    workspace: {
      ...workspace,
      mediaIds: media.map((asset) => asset.id),
    },
    outcome: options.outcome ?? options.current?.project.outcome,
    migratedFrom: options.migratedFrom ?? options.current?.project.migratedFrom,
  };
  return { schemaVersion: 3, project, media };
}

function draftFromHistory(entry: HistoryEntry): ListingDraft {
  return {
    ...emptyDraft(entry.createdAt),
    currentStep: 'review',
    completedSteps: ['analyze', 'comparables', 'price', 'templates', 'review'],
    fingerprint: entry.fingerprint,
    productFacts: factsFromFingerprint(entry.fingerprint),
    valuation: entry.valuation,
    templates: entry.templates,
  };
}

function statusFromHistory(entry: HistoryEntry): ProjectStatus {
  if (entry.saleStatus === 'sold') return 'sold';
  if (entry.saleStatus === 'not_sold') return 'paused';
  return 'listed';
}

class ProjectRepository {
  private static instance: ProjectRepository;

  static getInstance(): ProjectRepository {
    if (!ProjectRepository.instance) ProjectRepository.instance = new ProjectRepository();
    return ProjectRepository.instance;
  }

  async initialize(): Promise<ProjectRepositoryState> {
    try {
      const existing = await get<unknown>(INDEX_KEY, PROJECT_STORE);
      if (existing !== undefined) {
        if (!isProjectIndex(existing)) throw new Error('Unsupported project index.');
        return this.stateFromIndex(existing);
      }

      const [rawDraft, draft, history] = await Promise.all([
        get<unknown>(DATASET_KEYS['listing-draft']),
        listingDraftService.loadDraft(),
        historyService.list(200),
      ]);
      const explicitEmptyDraft =
        rawDraft === null ||
        (isRecord(rawDraft) && rawDraft.dataset === 'listing-draft' && rawDraft.data === null);
      if (rawDraft !== undefined && draft === null && !explicitEmptyDraft) {
        throw new Error('Legacy listing draft is corrupt or unsupported.');
      }
      const records: ProjectRecord[] = [];
      if (draft) {
        records.push(
          recordFromDraft('migrated-active-draft', draft, { migratedFrom: 'listing-draft' }),
        );
      }
      for (const entry of history) {
        records.push(
          recordFromDraft(`migrated-history-${entry.id}`, draftFromHistory(entry), {
            status: statusFromHistory(entry),
            createdAt: entry.createdAt,
            migratedFrom: 'history',
            outcome: {
              saleStatus: entry.saleStatus,
              soldPriceSek: entry.soldPriceSek,
              soldAt: entry.soldAt,
            },
          }),
        );
      }
      const index: ProjectIndex = {
        schemaVersion: 3,
        activeProjectId: records[0]?.project.id ?? null,
        projectIds: records.map((record) => record.project.id),
        migrationCompletedAt: new Date().toISOString(),
      };
      await setMany(
        [
          ...records.map((record) => [projectKey(record.project.id), record] as [string, unknown]),
          [INDEX_KEY, index] as [string, unknown],
        ],
        PROJECT_STORE,
      );
      const verified = await get<unknown>(INDEX_KEY, PROJECT_STORE);
      if (!isProjectIndex(verified) || verified.projectIds.length !== records.length) {
        throw new Error('Project migration verification failed.');
      }
      return this.stateFromIndex(index);
    } catch (error) {
      return {
        status: 'recovery',
        activeProjectId: null,
        projects: [],
        error: error instanceof Error ? error.message : 'Project data could not be opened.',
      };
    }
  }

  async create(): Promise<HydratedProject> {
    const index = await this.requireIndex();
    const now = new Date().toISOString();
    const id = `project-${crypto.randomUUID()}`;
    const record = recordFromDraft(id, emptyDraft(now), { createdAt: now });
    const nextIndex = {
      ...index,
      activeProjectId: id,
      projectIds: [id, ...index.projectIds],
    };
    await setMany(
      [
        [projectKey(id), record],
        [INDEX_KEY, nextIndex],
      ],
      PROJECT_STORE,
    );
    return this.hydrate(record);
  }

  async open(id: string): Promise<HydratedProject> {
    const index = await this.requireIndex();
    if (!index.projectIds.includes(id)) throw new Error('Project does not exist.');
    const record = await this.requireRecord(id);
    if (index.activeProjectId !== id) {
      await setMany([[INDEX_KEY, { ...index, activeProjectId: id }]], PROJECT_STORE);
    }
    return this.hydrate(record);
  }

  async save(id: string, draft: ListingDraft): Promise<ProjectSummary> {
    const index = await this.requireIndex();
    if (!index.projectIds.includes(id)) throw new Error('Project does not exist.');
    const current = await this.requireRecord(id);
    const record = recordFromDraft(id, draft, { current });
    await setMany([[projectKey(id), record]], PROJECT_STORE);
    return summary(record);
  }

  async setStatus(id: string, status: ProjectStatus): Promise<ProjectSummary> {
    const record = await this.requireRecord(id);
    const next: ProjectRecord = {
      ...record,
      project: {
        ...record.project,
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    await setMany([[projectKey(id), next]], PROJECT_STORE);
    return summary(next);
  }

  async setSection(id: string, currentSection: ProjectSection): Promise<ItemProject> {
    const record = await this.requireRecord(id);
    const next: ProjectRecord = {
      ...record,
      project: {
        ...record.project,
        currentSection,
        updatedAt: new Date().toISOString(),
      },
    };
    await setMany([[projectKey(id), next]], PROJECT_STORE);
    return next.project;
  }

  async list(): Promise<ProjectSummary[]> {
    const index = await this.requireIndex();
    const records = await Promise.all(index.projectIds.map((id) => this.requireRecord(id)));
    return records
      .map(summary)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async remove(id: string): Promise<ProjectRepositoryState> {
    const index = await this.requireIndex();
    const projectIds = index.projectIds.filter((projectId) => projectId !== id);
    const nextIndex: ProjectIndex = {
      ...index,
      projectIds,
      activeProjectId:
        index.activeProjectId === id ? (projectIds[0] ?? null) : index.activeProjectId,
    };
    await setMany(
      [
        [projectKey(id), null],
        [INDEX_KEY, nextIndex],
      ],
      PROJECT_STORE,
    );
    return this.stateFromIndex(nextIndex);
  }

  async exportBackup(includeImages = true): Promise<ProjectBackupDataset | undefined> {
    const rawIndex = await get<unknown>(INDEX_KEY, PROJECT_STORE);
    if (rawIndex === undefined) return undefined;
    if (!isProjectIndex(rawIndex)) throw new Error('Project index is corrupt or unsupported.');
    const records = await Promise.all(
      rawIndex.projectIds.map(async (id): Promise<ProjectBackupRecord> => {
        const record = await this.requireRecord(id);
        const images = includeImages
          ? await Promise.all(record.media.map((asset) => blobToDataUrl(asset.blob)))
          : [];
        return {
          project: includeImages
            ? record.project
            : {
                ...record.project,
                workspace: { ...record.project.workspace, mediaIds: [] },
              },
          images,
        };
      }),
    );
    return {
      schemaVersion: 3,
      activeProjectId: rawIndex.activeProjectId,
      imagesIncluded: includeImages,
      records,
    };
  }

  async importBackup(dataset: ProjectBackupDataset): Promise<ProjectRepositoryState> {
    if (!isProjectBackupDataset(dataset)) throw new Error('Project backup is invalid.');
    const currentRaw = await get<unknown>(INDEX_KEY, PROJECT_STORE);
    if (currentRaw !== undefined && !isProjectIndex(currentRaw)) {
      throw new Error('Current project index is corrupt or unsupported.');
    }
    const current = isProjectIndex(currentRaw) ? currentRaw : null;
    const records = dataset.records.map(({ project, images }) => {
      const draft: ListingDraft = { ...project.workspace, images };
      const record = recordFromDraft(project.id, draft, {
        status: project.status,
        createdAt: project.createdAt,
        migratedFrom: project.migratedFrom,
        outcome: project.outcome,
      });
      record.project = {
        ...record.project,
        title: project.title,
        currentSection: project.currentSection,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
      return record;
    });
    const index: ProjectIndex = {
      schemaVersion: 3,
      activeProjectId: dataset.activeProjectId,
      projectIds: records.map((record) => record.project.id),
      migrationCompletedAt: new Date().toISOString(),
    };
    await setMany(
      [
        ...(current?.projectIds ?? []).map((id) => [projectKey(id), null] as [string, unknown]),
        ...records.map((record) => [projectKey(record.project.id), record] as [string, unknown]),
        [INDEX_KEY, index] as [string, unknown],
      ],
      PROJECT_STORE,
    );
    return this.stateFromIndex(index);
  }

  async reset(): Promise<ProjectRepositoryState> {
    const rawIndex = await get<unknown>(INDEX_KEY, PROJECT_STORE);
    const projectIds = isProjectIndex(rawIndex) ? rawIndex.projectIds : [];
    const index: ProjectIndex = {
      schemaVersion: 3,
      activeProjectId: null,
      projectIds: [],
      migrationCompletedAt: new Date().toISOString(),
    };
    await setMany(
      [
        ...projectIds.map((id) => [projectKey(id), null] as [string, unknown]),
        [INDEX_KEY, index] as [string, unknown],
      ],
      PROJECT_STORE,
    );
    return this.stateFromIndex(index);
  }

  private async stateFromIndex(index: ProjectIndex): Promise<ProjectRepositoryState> {
    const projects = await this.listFromIndex(index);
    return { status: 'ready', activeProjectId: index.activeProjectId, projects };
  }

  private async listFromIndex(index: ProjectIndex): Promise<ProjectSummary[]> {
    const records = await Promise.all(index.projectIds.map((id) => this.requireRecord(id)));
    return records
      .map(summary)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  private async requireIndex(): Promise<ProjectIndex> {
    const index = await get<unknown>(INDEX_KEY, PROJECT_STORE);
    if (!isProjectIndex(index)) throw new Error('Project storage is not initialized.');
    return index;
  }

  private async requireRecord(id: string): Promise<ProjectRecord> {
    const record = await get<unknown>(projectKey(id), PROJECT_STORE);
    if (!isProjectRecord(record)) throw new Error('Project data is corrupt or unsupported.');
    return record;
  }

  private async hydrate(record: ProjectRecord): Promise<HydratedProject> {
    const images = await Promise.all(record.media.map((asset) => blobToDataUrl(asset.blob)));
    return {
      project: record.project,
      draft: {
        ...record.project.workspace,
        images,
      },
    };
  }
}

export const projectRepository = ProjectRepository.getInstance();
export { PROJECT_DB, PROJECT_STORE, emptyDraft };
