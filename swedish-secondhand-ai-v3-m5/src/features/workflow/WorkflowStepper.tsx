import { useTranslation } from 'react-i18next';
import type { WorkflowStep } from '@core/types';
import { useWorkflowStore } from '@core/store/useWorkflowStore';

const STEP_ORDER: WorkflowStep[] = ['analyze', 'comparables', 'price', 'templates', 'review'];

const STEP_LABELS: Record<WorkflowStep, string> = {
  analyze: 'stepAnalyze',
  comparables: 'stepComparables',
  price: 'stepPrice',
  templates: 'stepTemplates',
  review: 'stepReview',
};

export function WorkflowStepper() {
  const { t } = useTranslation('common');
  const { currentStep, completedSteps, setCurrentStep } = useWorkflowStore();

  return (
    <nav className="workflow-stepper" aria-label={t('workflow')}>
      {STEP_ORDER.map((step) => {
        const isActive = currentStep === step;
        const isComplete = completedSteps.includes(step);
        return (
          <button
            key={step}
            type="button"
            className={`workflow-step ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
            onClick={() => setCurrentStep(step)}
          >
            <span className="workflow-step__status">
              {isComplete ? '✓' : STEP_ORDER.indexOf(step) + 1}
            </span>
            <span>{t(STEP_LABELS[step])}</span>
          </button>
        );
      })}
    </nav>
  );
}
