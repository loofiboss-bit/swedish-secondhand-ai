import { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import type { HydratedProject } from '@core/services/projectRepository';
import type { ProjectSection } from '@core/types';
import { useListingStore } from '@core/store/useListingStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { CommandPalette } from '@shared/components/CommandPalette';
import type { ProjectQuickStartInput } from '@features/projects/ProjectDashboard';

type AppView = 'home' | 'projects' | 'workspace' | 'settings';

const AnalyzePanel = lazy(() =>
  import('@features/analyze/AnalyzePanel').then((module) => ({ default: module.AnalyzePanel })),
);
const SettingsPanel = lazy(() =>
  import('@features/settings/SettingsPanel').then((module) => ({ default: module.SettingsPanel })),
);
const DataManagementPanel = lazy(() =>
  import('@features/settings/DataManagementPanel').then((module) => ({
    default: module.DataManagementPanel,
  })),
);
const TemplatesPanel = lazy(() =>
  import('@features/templates/TemplatesPanel').then((module) => ({
    default: module.TemplatesPanel,
  })),
);
const ValuationPanel = lazy(() =>
  import('@features/valuation/ValuationPanel').then((module) => ({
    default: module.ValuationPanel,
  })),
);
const SummarySidebar = lazy(() =>
  import('@features/workflow/SummarySidebar').then((module) => ({
    default: module.SummarySidebar,
  })),
);
const OnboardingDialog = lazy(() =>
  import('@features/onboarding/OnboardingDialog').then((module) => ({
    default: module.OnboardingDialog,
  })),
);
const ProjectDashboard = lazy(() =>
  import('@features/projects/ProjectDashboard').then((module) => ({
    default: module.ProjectDashboard,
  })),
);
const WorkspaceTabs = lazy(() =>
  import('@features/projects/WorkspaceTabs').then((module) => ({
    default: module.WorkspaceTabs,
  })),
);
const CoachPanel = lazy(() =>
  import('@features/projects/CoachPanel').then((module) => ({ default: module.CoachPanel })),
);
const ProjectFollowUpPanel = lazy(() =>
  import('@features/projects/ProjectFollowUpPanel').then((module) => ({
    default: module.ProjectFollowUpPanel,
  })),
);

export function App() {
  const { t } = useTranslation('common');
  const { settings, isLoading: settingsLoading, load } = useSettingsStore();
  const valuationStore = useValuationStore();
  const listingStore = useListingStore();
  const workflowStore = useWorkflowStore();
  const {
    status: projectStatus,
    projects,
    activeProjectId,
    activeProject,
    error: projectError,
    initialize: initializeProjects,
    createProject: createProjectRecord,
    openProject: openProjectRecord,
    saveActive,
    setActiveSection,
    removeProject,
  } = useProjectStore();

  const [appView, setAppView] = useState<AppView>('home');
  const [workspaceSection, setWorkspaceSection] = useState<ProjectSection>('item');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaveBusy, setIsSaveBusy] = useState(false);
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);

  const {
    error: valuationError,
    loadManualComparables,
    runPipeline,
    estimateValue,
    generateTemplates,
    saveToHistory,
    hydrateFromDraft,
    buildDraft,
    setInputText,
    addImage,
  } = valuationStore;
  const { currentStep, completedSteps, hydrateFromDraft: hydrateWorkflow } = workflowStore;

  useEffect(() => {
    void load();
    void loadManualComparables();
    void initializeProjects();
  }, [load, loadManualComparables, initializeProjects]);

  useEffect(() => {
    void setAppLanguage(settings.language);
  }, [settings.language]);

  const hydrateProject = (hydrated: HydratedProject) => {
    hydrateFromDraft(hydrated.draft);
    listingStore.hydrateFromDraft(
      hydrated.draft.templates,
      hydrated.draft.listingDrafts,
      hydrated.draft.sellerTimePreference,
      hydrated.draft.sellPlan,
    );
    hydrateWorkflow(hydrated.draft.currentStep, hydrated.draft.completedSteps);
    setWorkspaceSection(hydrated.project.currentSection);
    setLastSavedAt(hydrated.draft.savedAt);
    setAppView('workspace');
  };

  const saveActiveProject = async () => {
    if (!activeProjectId || !activeProject) return;
    setIsSaveBusy(true);
    const draft = buildDraft(currentStep, completedSteps);
    await saveActive(draft);
    setLastSavedAt(draft.savedAt);
    setIsSaveBusy(false);
  };

  useEffect(() => {
    if (!activeProjectId || !activeProject || appView !== 'workspace' || isSwitchingProject) return;
    const timer = window.setTimeout(() => {
      const draft = buildDraft(currentStep, completedSteps);
      void saveActive(draft);
      setLastSavedAt(draft.savedAt);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    activeProjectId,
    activeProject,
    appView,
    saveActive,
    isSwitchingProject,
    buildDraft,
    currentStep,
    completedSteps,
    valuationStore.inputText,
    valuationStore.images,
    valuationStore.fingerprint,
    valuationStore.productFacts,
    valuationStore.factCandidates,
    valuationStore.knowledgeGaps,
    valuationStore.photoAssessments,
    valuationStore.comparableQueryPlan,
    valuationStore.localLearningSampleSize,
    valuationStore.traderaComps,
    valuationStore.manualComps,
    valuationStore.valuation,
    valuationStore.pricingStrategy,
    listingStore.templates,
    listingStore.listingDrafts,
    listingStore.sellerTimePreference,
    listingStore.sellPlan,
  ]);

  const openProject = async (id: string) => {
    setIsSwitchingProject(true);
    if (activeProjectId && activeProjectId !== id) {
      await saveActiveProject();
    }
    const hydrated = await openProjectRecord(id);
    if (hydrated) hydrateProject(hydrated);
    setIsSwitchingProject(false);
  };

  const createProject = async (input?: ProjectQuickStartInput) => {
    setIsSwitchingProject(true);
    if (activeProjectId) await saveActiveProject();
    const hydrated = await createProjectRecord(input?.displayName);
    if (hydrated) {
      hydrateProject(hydrated);
      if (input) {
        setInputText(input.description);
        input.images.forEach((image) => addImage(image));
      }
    }
    setIsSwitchingProject(false);
  };

  const finishOnboarding = (withExample: boolean) => {
    if (withExample) {
      void createProject({
        displayName: t('exampleProjectName'),
        description: t('exampleProjectDescription'),
        images: [],
      });
      return;
    }
    setAppView('home');
  };

  const changeSection = (section: ProjectSection) => {
    setWorkspaceSection(section);
    void setActiveSection(section);
  };

  const openCoachAction = (section: ProjectSection, targetId?: string) => {
    changeSection(section);
    if (targetId) {
      window.setTimeout(() => {
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusTarget = target?.matches('button, input, select, textarea, [tabindex]')
          ? target
          : target?.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]');
        focusTarget?.focus({ preventScroll: true });
      });
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (activeProjectId) void runPipeline();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeProjectId, runPipeline]);

  const commandActions = [
    { id: 'home', label: t('navHome'), run: () => setAppView('home') },
    { id: 'projects', label: t('navProjects'), run: () => setAppView('projects') },
    { id: 'new-project', label: t('newProject'), run: () => createProject() },
    { id: 'pipeline', label: t('cmdRunPipeline'), run: () => runPipeline() },
    { id: 'estimate', label: t('cmdEstimate'), run: () => estimateValue() },
    { id: 'templates', label: t('cmdGenerateTemplates'), run: () => generateTemplates() },
    { id: 'history', label: t('cmdSaveHistory'), run: () => saveToHistory() },
    { id: 'settings', label: t('settings'), run: () => setAppView('settings') },
  ];

  const loading = settingsLoading || projectStatus === 'loading';
  const error = valuationError || projectError;

  return (
    <div className="app-shell">
      <header className="app-header app-header--v2">
        <div className="brand-lockup">
          <h1>
            <button type="button" className="brand-button" onClick={() => setAppView('home')}>
              {t('appTitle')}
            </button>
          </h1>
          <p>{t('smartSellerCoach')}</p>
        </div>
        <nav className="app-nav" aria-label={t('mainNavigation')}>
          <button
            type="button"
            className={appView === 'home' ? 'is-active' : ''}
            onClick={() => setAppView('home')}
          >
            {t('navHome')}
          </button>
          <button
            type="button"
            className={appView === 'projects' ? 'is-active' : ''}
            onClick={() => setAppView('projects')}
          >
            {t('navProjects')}
          </button>
          <button
            type="button"
            className={appView === 'settings' ? 'is-active' : ''}
            onClick={() => setAppView('settings')}
          >
            {t('settings')}
          </button>
        </nav>
        <div className="header-actions">
          <button type="button" onClick={() => setIsCommandPaletteOpen(true)}>
            {t('commandPalette')}
          </button>
          {appView === 'workspace' && activeProjectId && (
            <button type="button" onClick={() => void saveActiveProject()} disabled={isSaveBusy}>
              {isSaveBusy ? t('savingDraft') : t('saveProjectNow')}
            </button>
          )}
        </div>
      </header>

      {error && (
        <p className="error-banner" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {!settingsLoading && !settings.onboardingCompleted ? (
        <main className="app-content app-content--onboarding">
          <Suspense fallback={<p className="loading-panel">{t('loadingPanel')}</p>}>
            <OnboardingDialog onStarted={finishOnboarding} />
          </Suspense>
        </main>
      ) : loading ? (
        <p className="loading-panel">{t('loadingProjects')}</p>
      ) : projectStatus === 'recovery' ? (
        <main className="recovery-layout">
          <section className="recovery-message">
            <h2>{t('projectRecoveryTitle')}</h2>
            <p>{t('projectRecoveryIntro')}</p>
          </section>
          <Suspense fallback={<p className="loading-panel">{t('loadingPanel')}</p>}>
            <DataManagementPanel />
          </Suspense>
        </main>
      ) : (
        <main className="app-content">
          <Suspense fallback={<p className="loading-panel">{t('loadingPanel')}</p>}>
            {appView === 'home' && (
              <ProjectDashboard
                mode="home"
                projects={projects}
                onCreate={(input) => void createProject(input)}
                onOpen={(id) => void openProject(id)}
                onRemove={(id) => void removeProject(id)}
              />
            )}
            {appView === 'projects' && (
              <ProjectDashboard
                mode="library"
                projects={projects}
                onCreate={(input) => void createProject(input)}
                onOpen={(id) => void openProject(id)}
                onRemove={(id) => void removeProject(id)}
              />
            )}
            {appView === 'settings' && (
              <div className="settings-view">
                <SettingsPanel />
                <DataManagementPanel />
              </div>
            )}
            {appView === 'workspace' && activeProject && (
              <div className="project-workspace">
                <header className="project-workspace__header">
                  <div>
                    <p className="eyebrow">{t(`projectStatus_${activeProject.status}`)}</p>
                    <h2>{activeProject.title}</h2>
                    {lastSavedAt && (
                      <p className="save-status">
                        {t('lastSaved')}: {new Date(lastSavedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => setAppView('projects')}>
                    {t('backToProjects')}
                  </button>
                </header>
                <WorkspaceTabs active={workspaceSection} onChange={changeSection} />
                <CoachPanel projectStatus={activeProject.status} onNavigate={openCoachAction} />
                <div className="workspace-layout">
                  <section className="workspace-main" tabIndex={-1}>
                    {workspaceSection === 'item' && <AnalyzePanel />}
                    {workspaceSection === 'market' && <ValuationPanel />}
                    {workspaceSection === 'listing' && <TemplatesPanel />}
                    {workspaceSection === 'follow-up' && (
                      <ProjectFollowUpPanel onNavigate={openCoachAction} />
                    )}
                  </section>
                  <SummarySidebar />
                </div>
              </div>
            )}
          </Suspense>
        </main>
      )}

      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandActions}
      />
    </div>
  );
}
