import { clear, get, set } from 'idb-keyval';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HistoryEntry, ListingDraft } from '@core/types';
import { DATASET_KEYS, createEnvelope } from './persistenceService';
import { listingDraftService } from './listingDraftService';
import { listingTemplateService } from './listingTemplateService';
import { factsFromFingerprint } from './verifiedFactsService';
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

  it('atomically migrates the active draft, media, and history into schema 4 projects', async () => {
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
    expect(hydrated.project).toMatchObject({
      schemaVersion: 4,
      displayName: 'IKEA Poang fåtölj',
      priceDecision: { kind: 'unset' },
      migratedFrom: 'listing-draft',
    });
    expect(hydrated.draft.images).toEqual(draft.images);
    expect(hydrated.project.workspace.mediaIds).toHaveLength(1);
  });

  it('migrates schema 3 records idempotently and retains the verified rollback source', async () => {
    const workspace = { ...draft, valuation: historyEntry.valuation };
    Reflect.deleteProperty(workspace, 'images');
    const legacyRecord = {
      schemaVersion: 3,
      project: {
        schemaVersion: 3,
        id: 'legacy-project',
        title: 'Äldre projekt',
        status: 'ready',
        currentSection: 'market',
        createdAt: '2026-07-15T08:00:00.000Z',
        updatedAt: '2026-07-16T08:00:00.000Z',
        workspace: { ...workspace, mediaIds: [] },
      },
      media: [],
    };
    await set('project:legacy-project', legacyRecord, PROJECT_STORE);
    await set(
      'meta:project-index',
      {
        schemaVersion: 3,
        activeProjectId: 'legacy-project',
        projectIds: ['legacy-project'],
        migrationCompletedAt: '2026-07-16T08:00:00.000Z',
      },
      PROJECT_STORE,
    );

    const first = await projectRepository.initialize();
    const second = await projectRepository.initialize();
    const migrated = await projectRepository.open('legacy-project');

    expect(first.projects).toHaveLength(1);
    expect(second.projects).toHaveLength(1);
    expect(migrated.project).toMatchObject({
      schemaVersion: 4,
      displayName: 'Äldre projekt',
      priceDecision: { kind: 'evidence_based' },
    });
    expect(await get('project:legacy-project', PROJECT_STORE)).toEqual(legacyRecord);
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

  it('keeps explicit names and price decisions and uses a recoverable trash', async () => {
    await projectRepository.initialize();
    const created = await projectRepository.create('Min stol');
    await projectRepository.setPriceDecision(created.project.id, {
      kind: 'user_entered',
      amountSek: 750,
    });
    await projectRepository.remove(created.project.id);

    expect(await projectRepository.list()).toEqual([]);
    expect(await projectRepository.listTrash()).toEqual([
      expect.objectContaining({ displayName: 'Min stol', trashedAt: expect.any(String) }),
    ]);
    const backup = await projectRepository.exportBackup();
    expect(backup?.records[0].project.priceDecision).toEqual({
      kind: 'user_entered',
      amountSek: 750,
    });

    await projectRepository.restore(created.project.id);
    expect(await projectRepository.list()).toEqual([
      expect.objectContaining({ displayName: 'Min stol', trashedAt: undefined }),
    ]);
    await projectRepository.remove(created.project.id);
    await projectRepository.emptyTrash();
    expect(await projectRepository.listTrash()).toEqual([]);
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
      listingDrafts: [
        {
          ...listingTemplateService.draftFromLegacyTemplate({
            site: 'blocket',
            title: 'IKEA stol',
            description: 'Beskrivning',
            priceSuggestionSek: 500,
            shippingSuggestion: 'Hämtning',
            tags: ['IKEA', 'stol'],
            disclaimer: 'Kontrollera fakta',
          }),
          imageOrder: [0],
          coverImageIndex: 0,
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
    expect(compact?.records[0].project.workspace.listingDrafts?.[0]).toMatchObject({
      imageOrder: [],
      coverImageIndex: null,
    });
    expect(compact?.records[0].project.workspace.factCandidates?.[0].references).toEqual([
      { kind: 'text', excerpt: 'IKEA stol' },
    ]);
  });

  it('rejects a poisoned autosave before replacing the previous valid project record', async () => {
    await projectRepository.initialize();
    const created = await projectRepository.create();
    await projectRepository.save(created.project.id, { ...created.draft, inputText: 'Safe draft' });
    const candidates = Array.from({ length: 101 }, (_, index) => ({
      id: `ollama:attribute-${index}`,
      key: `attribute-${index}`,
      value: 'value',
      source: 'ollama' as const,
      confidence: 0.7,
      uncertainty: 'medium' as const,
      references: [],
    }));

    await expect(
      projectRepository.save(created.project.id, {
        ...created.draft,
        inputText: 'Poisoned draft',
        factCandidates: candidates,
      }),
    ).rejects.toThrow(/invalid/i);
    await expect(projectRepository.open(created.project.id)).resolves.toMatchObject({
      draft: { inputText: 'Safe draft' },
    });
  });

  it('enters read-only recovery without committing a v3 index when legacy data is corrupt', async () => {
    await set(DATASET_KEYS['listing-draft'], createEnvelope('listing-draft', { version: 1 }));

    const state = await projectRepository.initialize();

    expect(state).toMatchObject({ status: 'recovery', activeProjectId: null, projects: [] });
    expect(state.error).toMatch(/draft|corrupt|unsupported/i);
  });

  it('records a verified sale outcome and exposes only complete local calibration evidence', async () => {
    await projectRepository.initialize();
    const created = await projectRepository.create();
    await projectRepository.save(created.project.id, {
      ...created.draft,
      fingerprint: draft.fingerprint,
      productFacts: factsFromFingerprint(draft.fingerprint!),
      valuation: historyEntry.valuation,
    });

    await expect(
      projectRepository.setOutcome(created.project.id, {
        saleStatus: 'pending',
        marketplace: 'blocket',
        listedAt: '2026-07-01T12:00:00.000Z',
        askingPriceSek: 520,
        listingUrl: 'javascript:alert(1)',
      }),
    ).rejects.toThrow(/HTTP or HTTPS/);

    const updated = await projectRepository.setOutcome(created.project.id, {
      saleStatus: 'sold',
      marketplace: 'blocket',
      listedAt: '2026-07-01T12:00:00.000Z',
      askingPriceSek: 520,
      soldPriceSek: 480,
      soldAt: '2026-07-08T12:00:00.000Z',
    });

    expect(updated).toMatchObject({ status: 'sold', outcome: { saleDurationDays: 7 } });
    await expect(projectRepository.listVerifiedOutcomes()).resolves.toEqual([
      expect.objectContaining({
        projectId: created.project.id,
        category: 'Furniture',
        recommendedPriceSek: 500,
        soldPriceSek: 480,
        saleDurationDays: 7,
      }),
    ]);
  });
});
