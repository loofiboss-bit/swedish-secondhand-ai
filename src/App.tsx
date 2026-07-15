import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { useListingStore } from '@core/store/useListingStore';
import { setAppLanguage } from '@core/config/i18n';
import { listingDraftService } from '@core/services/listingDraftService';
import type { ListingDraft } from '@core/types';
import { CommandPalette } from '@shared/components/CommandPalette';

const AnalyzePanel = lazy(() =>
  import('@features/analyze/AnalyzePanel').then((module) => ({ default: module.AnalyzePanel })),
);
const HistoryPanel = lazy(() =>
  import('@features/history/HistoryPanel').then((module) => ({ default: module.HistoryPanel })),
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
const WorkflowStepper = lazy(() =>
  import('@features/workflow/WorkflowStepper').then((module) => ({
    default: module.WorkflowStepper,
  })),
);
const OnboardingDialog = lazy(() =>
  import('@features/onboarding/OnboardingDialog').then((module) => ({
    default: module.OnboardingDialog,
  })),
);

export function App() {
  const { t } = useTranslation('common');
  const { settings, isLoading: settingsLoading, load } = useSettingsStore();
  const valuationStore = useValuationStore();
  const listingStore = useListingStore();
  const workflowStore = useWorkflowStore();

  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ListingDraft | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaveDraftBusy, setIsSaveDraftBusy] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'normal' | 'conflict'>('normal');
  const workspaceMainRef = useRef<HTMLElement>(null);

  const {
    error,
    loadManualComparables,
    runPipeline,
    estimateValue,
    generateTemplates,
    saveToHistory,
    hydrateFromDraft,
    buildDraft,
  } = valuationStore;

  const {
    currentStep,
    completedSteps,
    nextStep,
    previousStep,
    hydrateFromDraft: hydrateWorkflow,
  } = workflowStore;

  useEffect(() => {
    void load();
    void loadManualComparables();
  }, [load, loadManualComparables]);

  useEffect(() => {
    void setAppLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    if (hasLoadedDraft) return;
    void listingDraftService.loadDraft().then((draft) => {
      if (draft) {
        setPendingDraft(draft);
        const valuationState = useValuationStore.getState();
        const listingState = useListingStore.getState();
        const hasCurrentWork =
          valuationState.inputText.trim().length > 0 ||
          valuationState.images.length > 0 ||
          valuationState.fingerprint !== null ||
          listingState.templates.length > 0;
        setRestoreMode(hasCurrentWork ? 'conflict' : 'normal');
      }
      setHasLoadedDraft(true);
    });
  }, [hasLoadedDraft]);

  const saveDraftNow = async () => {
    setIsSaveDraftBusy(true);
    const draft = buildDraft(currentStep, completedSteps);
    await listingDraftService.saveDraft(draft);
    setLastSavedAt(draft.savedAt);
    setIsSaveDraftBusy(false);
  };

  useEffect(() => {
    if (!hasLoadedDraft) return;

    const timer = window.setTimeout(() => {
      const draft = buildDraft(currentStep, completedSteps);
      void listingDraftService.saveDraft(draft);
      setLastSavedAt(draft.savedAt);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    hasLoadedDraft,
    buildDraft,
    currentStep,
    completedSteps,
    valuationStore.inputText,
    valuationStore.images,
    valuationStore.fingerprint,
    valuationStore.productFacts,
    valuationStore.traderaComps,
    valuationStore.manualComps,
    valuationStore.valuation,
    valuationStore.pricingStrategy,
    listingStore.templates,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void runPipeline();
      }

      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        nextStep();
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        previousStep();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nextStep, previousStep, runPipeline]);

  useEffect(() => {
    if (completedSteps.length > 0) workspaceMainRef.current?.focus();
  }, [currentStep, completedSteps.length]);

  const commandActions = useMemo(
    () => [
      { id: 'pipeline', label: t('cmdRunPipeline'), run: () => runPipeline() },
      { id: 'fetch-estimate', label: t('cmdEstimate'), run: () => estimateValue() },
      { id: 'templates', label: t('cmdGenerateTemplates'), run: () => generateTemplates() },
      { id: 'history', label: t('cmdSaveHistory'), run: () => saveToHistory() },
      { id: 'next', label: t('cmdNextStep'), run: () => nextStep() },
      { id: 'prev', label: t('cmdPreviousStep'), run: () => previousStep() },
    ],
    [t, runPipeline, estimateValue, generateTemplates, saveToHistory, nextStep, previousStep],
  );

  const resumeDraft = async () => {
    if (!pendingDraft) return;
    hydrateFromDraft(pendingDraft);
    listingStore.hydrateFromDraft(pendingDraft.templates);
    hydrateWorkflow(pendingDraft.currentStep, pendingDraft.completedSteps);
    setLastSavedAt(pendingDraft.savedAt);
    setPendingDraft(null);
  };

  const discardDraft = async () => {
    await listingDraftService.clearDraft();
    setPendingDraft(null);
  };

  return (
    <div className="app-shell">
      {!settingsLoading && !settings.onboardingCompleted && (
        <Suspense fallback={<p className="loading-panel">{t('loadingPanel')}</p>}>
          <OnboardingDialog />
        </Suspense>
      )}
      <header className="app-header">
        <div>
          <h1>{t('appTitle')}</h1>
          <p>{t('subtitle')}</p>
          {lastSavedAt && (
            <p className="save-status">
              {t('lastSaved')}: {new Date(lastSavedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => previousStep()}>
            {t('prevStep')}
          </button>
          <button type="button" onClick={() => nextStep()}>
            {t('nextStep')}
          </button>
          <button type="button" onClick={() => setIsCommandPaletteOpen(true)}>
            {t('commandPalette')}
          </button>
          <button type="button" onClick={() => void saveDraftNow()} disabled={isSaveDraftBusy}>
            {isSaveDraftBusy ? t('savingDraft') : t('saveDraftNow')}
          </button>
        </div>
      </header>

      {pendingDraft && (
        <div className="draft-banner">
          <p>
            {restoreMode === 'conflict' ? t('resumeDraftConflictPrompt') : t('resumeDraftPrompt')} (
            {new Date(pendingDraft.savedAt).toLocaleString()})
          </p>
          <div className="inline-actions">
            <button type="button" onClick={() => void resumeDraft()}>
              {restoreMode === 'conflict' ? t('replaceWithDraft') : t('resumeDraft')}
            </button>
            {restoreMode === 'conflict' && (
              <button type="button" onClick={() => setPendingDraft(null)}>
                {t('keepCurrentSession')}
              </button>
            )}
            <button type="button" onClick={() => void discardDraft()}>
              {t('discardDraft')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="error-banner" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      <Suspense fallback={<p className="loading-panel">{t('loadingPanel')}</p>}>
        <WorkflowStepper />
      </Suspense>

      <main className="workspace-layout">
        <section
          className="workspace-main"
          ref={workspaceMainRef}
          tabIndex={-1}
          aria-label={t(`step${currentStep[0].toUpperCase()}${currentStep.slice(1)}`)}
        >
          <Suspense fallback={<p className="loading-panel">{t('loadingPanel')}</p>}>
            {(currentStep === 'analyze' || completedSteps.length === 0) && <AnalyzePanel />}
            {(currentStep === 'comparables' || currentStep === 'price') && <ValuationPanel />}
            {(currentStep === 'templates' || currentStep === 'review') && <TemplatesPanel />}
            {currentStep === 'review' && <HistoryPanel />}
            <SettingsPanel />
            <DataManagementPanel />
          </Suspense>
        </section>

        <Suspense fallback={<p className="loading-panel">{t('loadingPanel')}</p>}>
          <SummarySidebar />
        </Suspense>
      </main>

      <CommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandActions}
      />
    </div>
  );
}
