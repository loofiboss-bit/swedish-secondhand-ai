import { create } from 'zustand';
import type { HydratedProject, ProjectRepositoryState } from '@core/services/projectRepository';
import { projectRepository } from '@core/services/projectRepository';
import type {
  ItemProject,
  ListingDraft,
  ProjectOutcome,
  ProjectSection,
  ProjectStatus,
  ProjectSummary,
} from '@core/types';

interface ProjectState {
  status: 'idle' | 'loading' | 'ready' | 'recovery';
  projects: ProjectSummary[];
  activeProjectId: string | null;
  activeProject: ItemProject | null;
  error: string | null;
  initialize: () => Promise<void>;
  createProject: () => Promise<HydratedProject | null>;
  openProject: (id: string) => Promise<HydratedProject | null>;
  saveActive: (draft: ListingDraft) => Promise<void>;
  setActiveStatus: (status: ProjectStatus) => Promise<void>;
  updateActiveOutcome: (outcome: ProjectOutcome) => Promise<void>;
  setActiveSection: (section: ProjectSection) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

function applyRepositoryState(state: ProjectRepositoryState) {
  return {
    status: state.status,
    projects: state.projects,
    activeProjectId: state.activeProjectId,
    error: state.error ?? null,
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
  createProject: async () => {
    try {
      const hydrated = await projectRepository.create();
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
      set({ error: error instanceof Error ? error.message : 'Project could not be created.' });
      return null;
    }
  },
  openProject: async (id) => {
    try {
      const hydrated = await projectRepository.open(id);
      set({ activeProjectId: id, activeProject: hydrated.project, error: null });
      return hydrated;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Project could not be opened.' });
      return null;
    }
  },
  saveActive: async (draft) => {
    const id = get().activeProjectId;
    if (!id) return;
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
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Project could not be saved.' });
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
      set({ error: error instanceof Error ? error.message : 'Project status could not be saved.' });
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
      set({
        error: error instanceof Error ? error.message : 'Listing outcome could not be saved.',
      });
    }
  },
  setActiveSection: async (section) => {
    const id = get().activeProjectId;
    if (!id) return;
    try {
      const project = await projectRepository.setSection(id, section);
      set({ activeProject: project, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Project section could not be saved.',
      });
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
      set({ error: error instanceof Error ? error.message : 'Project could not be removed.' });
    }
  },
}));
