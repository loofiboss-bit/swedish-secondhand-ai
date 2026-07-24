import { create } from 'zustand';
import type { AppErrorCode, WorkflowStep } from '@core/types';

const STEP_ORDER: WorkflowStep[] = ['analyze', 'comparables', 'price', 'templates', 'review'];

function isWorkflowStep(value: unknown): value is WorkflowStep {
  return typeof value === 'string' && STEP_ORDER.includes(value as WorkflowStep);
}

function sanitizeCompletedSteps(
  completedSteps: unknown[],
  currentStep: WorkflowStep,
): WorkflowStep[] {
  const maxAllowedIndex = STEP_ORDER.indexOf(currentStep);
  const input = new Set(completedSteps.filter(isWorkflowStep));

  return STEP_ORDER.filter((step, index) => index <= maxAllowedIndex && input.has(step));
}

interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  stepErrors: Partial<Record<WorkflowStep, AppErrorCode>>;
  setCurrentStep: (step: WorkflowStep) => void;
  markStepComplete: (step: WorkflowStep) => void;
  setStepError: (step: WorkflowStep, error: AppErrorCode | null) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWorkflow: () => void;
  hydrateFromDraft: (step: WorkflowStep, completed: WorkflowStep[]) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  currentStep: 'analyze',
  completedSteps: [],
  stepErrors: {},
  setCurrentStep: (currentStep) => {
    if (!isWorkflowStep(currentStep)) {
      return;
    }
    set({ currentStep });
  },
  markStepComplete: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),
  setStepError: (step, error) =>
    set((state) => ({
      stepErrors: {
        ...state.stepErrors,
        [step]: error ?? '',
      },
    })),
  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const next = STEP_ORDER[Math.min(STEP_ORDER.length - 1, currentIndex + 1)];
    set({ currentStep: next });
  },
  previousStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    const next = STEP_ORDER[Math.max(0, currentIndex - 1)];
    set({ currentStep: next });
  },
  resetWorkflow: () =>
    set({
      currentStep: 'analyze',
      completedSteps: [],
      stepErrors: {},
    }),
  hydrateFromDraft: (currentStep, completedSteps) => {
    const safeCurrentStep = isWorkflowStep(currentStep) ? currentStep : 'analyze';
    const safeCompletedSteps = sanitizeCompletedSteps(completedSteps, safeCurrentStep);

    set({
      currentStep: safeCurrentStep,
      completedSteps: safeCompletedSteps,
    });
  },
}));
