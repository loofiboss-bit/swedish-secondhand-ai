import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemProject, ListingDraft, ProjectReadiness, ProjectSummary } from '@core/types';
import { projectRepository, type HydratedProject } from '@core/services/projectRepository';
import { evaluateProjectReadiness } from '@core/services/projectReadinessService';
import { useProjectStore } from './useProjectStore';

function emptyDraft(savedAt = '2026-07-24T08:00:00.000Z'): ListingDraft {
  return {
    version: 1,
    savedAt,
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

function emptyReadiness(): ProjectReadiness {
  return evaluateProjectReadiness({
    facts: null,
    photos: [],
    comparables: [],
    valuation: null,
    priceDecision: { kind: 'unset' },
    listingDrafts: [],
    projectStatus: 'draft',
  });
}

function summary(id: string, updatedAt = '2026-07-24T08:00:00.000Z'): ProjectSummary {
  return {
    id,
    displayName: id,
    title: id,
    status: 'draft',
    updatedAt,
    recommendedPriceSek: null,
    selectedPriceSek: null,
    selectedMarketplace: null,
    readiness: emptyReadiness(),
  };
}

function hydrated(id: string): HydratedProject {
  const draft = emptyDraft();
  const project: ItemProject = {
    schemaVersion: 4,
    id,
    displayName: id,
    title: id,
    status: 'draft',
    currentSection: 'item',
    createdAt: draft.savedAt,
    updatedAt: draft.savedAt,
    priceDecision: { kind: 'unset' },
    workspace: { ...draft, mediaIds: [] },
  };
  return { project, draft };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useProjectStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useProjectStore.setState({
      status: 'ready',
      projects: [],
      trash: [],
      activeProjectId: null,
      activeProject: null,
      error: null,
    });
  });

  it('keeps the latest project open when concurrent requests resolve out of order', async () => {
    const first = deferred<HydratedProject>();
    const second = deferred<HydratedProject>();
    vi.spyOn(projectRepository, 'open').mockImplementation((id) =>
      id === 'first' ? first.promise : second.promise,
    );

    const firstOpen = useProjectStore.getState().openProject('first');
    const secondOpen = useProjectStore.getState().openProject('second');
    second.resolve(hydrated('second'));
    await expect(secondOpen).resolves.toMatchObject({ project: { id: 'second' } });
    first.resolve(hydrated('first'));
    await expect(firstOpen).resolves.toBeNull();

    expect(useProjectStore.getState()).toMatchObject({
      activeProjectId: 'second',
      activeProject: { id: 'second' },
    });
  });

  it('serializes rapid saves so the newest draft is persisted last', async () => {
    const first = deferred<ProjectSummary>();
    const second = deferred<ProjectSummary>();
    const save = vi
      .spyOn(projectRepository, 'save')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    useProjectStore.setState({
      activeProjectId: 'project',
      activeProject: hydrated('project').project,
      projects: [summary('project')],
    });

    const firstSave = useProjectStore.getState().saveActive(emptyDraft('2026-07-24T08:01:00Z'));
    const secondSave = useProjectStore.getState().saveActive(emptyDraft('2026-07-24T08:02:00Z'));
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    first.resolve(summary('project', '2026-07-24T08:01:00Z'));
    await expect(firstSave).resolves.toBe(true);
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    second.resolve(summary('project', '2026-07-24T08:02:00Z'));
    await expect(secondSave).resolves.toBe(true);

    expect(useProjectStore.getState().projects[0].updatedAt).toBe('2026-07-24T08:02:00Z');
  });

  it('keeps an operation failure visible without discarding active project state', async () => {
    vi.spyOn(projectRepository, 'rename').mockRejectedValue(new Error('disk full'));
    useProjectStore.setState({
      activeProjectId: 'project',
      activeProject: hydrated('project').project,
      projects: [summary('project')],
    });

    await useProjectStore.getState().renameProject('project', 'New name');

    expect(useProjectStore.getState()).toMatchObject({
      activeProject: { id: 'project', displayName: 'project' },
      error: 'project_operation_failed',
    });
  });

  it('keeps a failed save retryable and preserves the active project', async () => {
    const save = vi
      .spyOn(projectRepository, 'save')
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(summary('project', '2026-07-24T08:03:00Z'));
    useProjectStore.setState({
      activeProjectId: 'project',
      activeProject: hydrated('project').project,
      projects: [summary('project')],
    });

    await expect(
      useProjectStore.getState().saveActive(emptyDraft('2026-07-24T08:02:00Z')),
    ).resolves.toBe(false);
    expect(useProjectStore.getState()).toMatchObject({
      activeProject: { id: 'project' },
      error: 'save_failed',
    });

    await expect(
      useProjectStore.getState().saveActive(emptyDraft('2026-07-24T08:03:00Z')),
    ).resolves.toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
    expect(useProjectStore.getState()).toMatchObject({
      activeProject: { id: 'project' },
      error: null,
    });
  });

  it('moves the active project to recoverable trash without keeping stale active state', async () => {
    vi.spyOn(projectRepository, 'remove').mockResolvedValue({
      status: 'ready',
      activeProjectId: null,
      projects: [],
    });
    vi.spyOn(projectRepository, 'listTrash').mockResolvedValue([summary('project')]);
    useProjectStore.setState({
      activeProjectId: 'project',
      activeProject: hydrated('project').project,
      projects: [summary('project')],
    });

    await useProjectStore.getState().removeProject('project');

    expect(useProjectStore.getState()).toMatchObject({
      projects: [],
      trash: [{ id: 'project' }],
      activeProjectId: null,
      activeProject: null,
      error: null,
    });
  });

  it('restores another project without cross-wiring the active project and draft', async () => {
    vi.spyOn(projectRepository, 'restore').mockResolvedValue({
      status: 'ready',
      activeProjectId: 'active',
      projects: [summary('restored'), summary('active')],
    });
    vi.spyOn(projectRepository, 'listTrash').mockResolvedValue([]);
    useProjectStore.setState({
      activeProjectId: 'active',
      activeProject: hydrated('active').project,
      projects: [summary('active')],
      trash: [summary('restored')],
    });

    await useProjectStore.getState().restoreProject('restored');

    expect(useProjectStore.getState()).toMatchObject({
      activeProjectId: 'active',
      activeProject: { id: 'active' },
      trash: [],
      error: null,
    });
  });
});
