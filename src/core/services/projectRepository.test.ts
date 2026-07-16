import { clear, set } from 'idb-keyval';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HistoryEntry, ListingDraft } from '@core/types';
import { DATASET_KEYS, createEnvelope } from './persistenceService';
import { listingDraftService } from './listingDraftService';
import { PROJECT_STORE, projectRepository } from './projectRepository';

const draft: ListingDraft = {
  version: 1,
  savedAt: '2026-07-16T08:00:00.000Z',
  currentStep: 'price',
  completedSteps: ['analyze', 'comparables'],
  pricingStrategy: 'balanced',
  inputText: 'IKEA Poang fåtölj',
  images: ['data:image/png;base64,AQID'],
  fingerprint: {
    title: 'IKEA Poang fåtölj',
    category: 'Furniture',
    brand: 'IKEA',
    model: 'Poang',
    conditionGrade: 'good',
    attributes: {},
    detectedLanguage: 'sv',
    confidence: 0.8,
  },
  productFacts: null,
  traderaComps: [],
  manualComps: [],
  valuation: null,
  templates: [],
};

const historyEntry: HistoryEntry = {
  id: 'history-1',
  createdAt: '2026-07-15T10:00:00.000Z',
  fingerprint: draft.fingerprint!,
  valuation: {
    status: 'ready',
    priceMinSek: 400,
    priceRecommendedSek: 500,
    priceMaxSek: 600,
    confidence: 0.7,
    rationale: 'Verified evidence.',
    pricingStrategy: 'balanced',
    confidenceBreakdown: { similarity: 0.8, sampleSize: 0.5, sourceQuality: 0.8, calibration: 1 },
    compsUsed: [],
    adjustments: [],
  },
  templates: [],
  saleStatus: 'sold',
  soldPriceSek: 480,
  soldAt: '2026-07-16T07:00:00.000Z',
};

describe('projectRepository', () => {
  beforeEach(async () => {
    Object.defineProperty(globalThis, 'Blob', { configurable: true, value: NodeBlob });
    await clear();
    await clear(PROJECT_STORE);
  });

  it('atomically migrates the active draft, media, and history into schema 3 projects', async () => {
    await listingDraftService.saveDraft(draft);
    await set(DATASET_KEYS.history, createEnvelope('history', [historyEntry]));

    const first = await projectRepository.initialize();
    const second = await projectRepository.initialize();

    expect(first).toMatchObject({ status: 'ready', activeProjectId: 'migrated-active-draft' });
    expect(first.projects).toHaveLength(2);
    expect(second.projects).toHaveLength(2);
    expect(second.projects.find((project) => project.id.includes('history'))).toMatchObject({
      status: 'sold',
      recommendedPriceSek: 500,
    });

    const hydrated = await projectRepository.open('migrated-active-draft');
    expect(hydrated.project).toMatchObject({ schemaVersion: 3, migratedFrom: 'listing-draft' });
    expect(hydrated.draft.images).toEqual(draft.images);
    expect(hydrated.project.workspace.mediaIds).toHaveLength(1);
  });

  it('creates and independently saves multiple projects', async () => {
    await projectRepository.initialize();
    const first = await projectRepository.create();
    const second = await projectRepository.create();
    await projectRepository.save(first.project.id, { ...first.draft, inputText: 'First item' });
    await projectRepository.save(second.project.id, { ...second.draft, inputText: 'Second item' });

    const projects = await projectRepository.list();
    expect(projects).toHaveLength(2);
    expect((await projectRepository.open(first.project.id)).draft.inputText).toBe('First item');
    expect((await projectRepository.open(second.project.id)).draft.inputText).toBe('Second item');
  });

  it('persists local photo assessments and fact candidates with the project workspace', async () => {
    await projectRepository.initialize();
    const created = await projectRepository.create();
    const enriched: ListingDraft = {
      ...created.draft,
      images: ['data:image/png;base64,AQID'],
      factCandidates: [
        {
          id: 'offline:brand:ikea',
          key: 'brand',
          value: 'IKEA',
          source: 'offline',
          confidence: 0.45,
          uncertainty: 'high',
          references: [{ kind: 'text', excerpt: 'IKEA stol' }],
        },
      ],
      knowledgeGaps: [{ key: 'model', reasonKey: 'knowledgeGap_model' }],
      photoAssessments: [
        {
          version: 1,
          imageIndex: 0,
          role: 'cover',
          width: 1200,
          height: 1200,
          brightness: 0.5,
          contrast: 0.3,
          sharpness: 0.4,
          perceptualHash: 'aaaaaaaaaaaaaaaa',
          cropRisk: false,
          issues: [],
          assessedAt: '2026-07-16T09:00:00.000Z',
        },
      ],
    };

    await projectRepository.save(created.project.id, enriched);
    const reopened = await projectRepository.open(created.project.id);

    expect(reopened.draft.factCandidates).toEqual(enriched.factCandidates);
    expect(reopened.draft.photoAssessments).toEqual(enriched.photoAssessments);
    expect(reopened.draft.images).toEqual(enriched.images);

    const compact = await projectRepository.exportBackup(false);
    expect(compact?.records[0].images).toEqual([]);
    expect(compact?.records[0].project.workspace.photoAssessments).toEqual([]);
    expect(compact?.records[0].project.workspace.factCandidates?.[0].references).toEqual([
      { kind: 'text', excerpt: 'IKEA stol' },
    ]);
  });

  it('enters read-only recovery without committing a v3 index when legacy data is corrupt', async () => {
    await set(DATASET_KEYS['listing-draft'], createEnvelope('listing-draft', { version: 1 }));

    const state = await projectRepository.initialize();

    expect(state).toMatchObject({ status: 'recovery', activeProjectId: null, projects: [] });
    expect(state.error).toMatch(/draft|corrupt|unsupported/i);
  });
});
