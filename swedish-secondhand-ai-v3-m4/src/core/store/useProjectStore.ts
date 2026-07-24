import { create } from 'zustand';
import type { HydratedProject, ProjectRepositoryState } from '@core/services/projectRepository';
import { projectRepository } from '@core/services/projectRepository';
import { normalizeAppError } from '@core/services/appErrorService';
import type {
  AppErrorCode,
  ItemProject,
  ListingDraft,
  ProjectOutcome,
  PriceDecision,
  ProjectSection,
  ProjectStatus,
  ProjectSummary,
} from '@core/types';

interface ProjectState {
  status: 'idle' | 'loading' | 'ready' | 'recovery';
  projects: ProjectSummary[];
  activeProjectId: string | null;
  activeProject: ItemProject | null;
  error: AppErrorCode | null;
  initialize: () => Promise<void>;
  createProject: (displayName?: string) => Promise<HydratedProject | null>;
  openProject: (id: string) => Promise<HydratedProject | null>;
  saveActive: (draft: ListingDraft) => Promise<boolean>;
  setActiveStatus: (status: ProjectStatus) => Promise<void>;
  updateActiveOutcome: (outcome: ProjectOutcome) => Promise<void>;
  setActiveSection: (section: ProjectSection) => Promise<void>;
  setActivePriceDecision: (decision: PriceDecision) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

function applyRepositoryState(state: ProjectRepositoryState) {
  return {
    status: state.status,
    projects: state.projects,
    activeProjectId: state.activeProjectId,
    error: state.error ? ('project_operation_failed' as const) : null,
  } as const;
}

function replaceSummary(projects: ProjectSummary[], summary: ProjectSummary): ProjectSummary[] {
  return [summary, ...projects.filter((project) => project.id !== summary.id)].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  status: 'idle',
  projects: [],
  activeProjectId: null,
  activeProject: null,
  error: null,
  initialize: async () => {
    set({ status: 'loading', error: null });
    const state = await projectRepository.initialize();
    set({ ...applyRepositoryState(state), activeProject: null });
  },
  createProject: async (displayName) => {
    try {
      const hydrated = await projectRepository.create(displayName);
      const projects = await projectRepository.list();
      set({
        status: 'ready',
        projects,
        activeProjectId: hydrated.project.id,
        activeProject: hydrated.project,
        error: null,
      });
      return hydrated;
    } catch (error) {
      set({ error: normalizeAppError(error, 'project_operation_failed') });
      return null;
    }
  },
  openProject: async (id) => {
    try {
      const hydrated = await projectRepository.open(id);
      set({ activeProjectId: id, activeProject: hydrated.project, error: null });
      return hydrated;
    } catch (error) {
      set({ error: normalizeAppError(error, 'project_operation_failed') });
      return null;
    }
  },
  saveActive: async (draft) => {
    const id = get().activeProjectId;
    if (!id) return false;
    try {
      const saved = await projectRepository.save(id, draft);
      set((state) => ({
        projects: replaceSummary(state.projects, saved),
        activeProject:
          state.activeProject?.id === id
            ? {
                ...state.activeProject,
                title: saved.title,
                status: saved.status,
                updatedAt: saved.updatedAt,
              }
            : state.activeProject,
        error: null,
      }));
      return true;
    } catch (error) {
      set({ error: normalizeAppError(error, 'save_failed') });
      return false;
    }
  },
  setActiveStatus: async (status) => {
    const id = get().activeProjectId;
    if (!id) return;
    try {
      const saved = await projectRepository.setStatus(id, status);
      set((state) => ({
        projects: replaceSummary(state.projects, saved),
        activeProject:
          state.activeProject?.id === id
            ? { ...state.activeProject, status, updatedAt: saved.updatedAt }
            : state.activeProject,
        error: null,
      }));
    } catch (error) {
      set({ error: normalizeAppError(error, 'project_operation_failed') });
    }
  },
  updateActiveOutcome: async (outcome) => {
    const id = get().activeProjectId;
    if (!id) return;
    try {
      const updated = await projectRepository.setOutcome(id, outcome);
      set((state) => ({
        projects: replaceSummary(state.projects, updated.summary),
        activeProject:
          state.activeProject?.id === id
            ? {
                ...state.activeProject,
                status: updated.status,
                outcome: updated.outcome,
                updatedAt: updated.summary.updatedAt,
              }
            : state.activeProject,
        error: null,
      }));
    } catch (error) {
      set({ error: normalizeAppError(error, 'project_operation_failed') });
    }
  },
  setActiveSection: async (section) => {
    const id = get().activeProjectId;
    if (!id) return;
    try {
      const project = await projectRepository.setSection(id, section);
      set({ activeProject: project, error: null });
    } catch (error) {
      set({ error: normalizeAppError(error, 'project_operation_failed') });
    }
  },
  setActivePriceDecision: async (priceDecision) => {
    const id = get().activeProjectId;
    if (!id) return;
    try {
      const summary = await projectRepository.setPriceDecision(id, priceDecision);
      set((state) => ({
        projects: replaceSummary(state.projects, summary),
        activeProject:
          state.activeProject?.id === id
            ? { ...state.activeProject, priceDecision, updatedAt: summary.updatedAt }
            : state.activeProject,
        error: null,
      }));
    } catch (error) {
      set({ error: normalizeAppError(error, 'project_operation_failed') });
    }
  },
  removeProject: async (id) => {
    try {
      const state = await projectRepository.remove(id);
      set({
        ...applyRepositoryState(state),
        activeProject: get().activeProjectId === id ? null : get().activeProject,
      });
    } catch (error) {
      set({ error: normalizeAppError(error, 'project_operation_failed') });
    }
  },
}));
