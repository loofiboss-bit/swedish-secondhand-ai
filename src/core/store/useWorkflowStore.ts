import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WorkflowStep } from '@core/types';

const STEP_ORDER: WorkflowStep[] = ['analyze', 'comparables', 'price', 'templates', 'review'];

interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  stepErrors: Partial<Record<WorkflowStep, string>>;
  setCurrentStep: (step: WorkflowStep) => void;
  markStepComplete: (step: WorkflowStep) => void;
  setStepError: (step: WorkflowStep, error: string | null) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWorkflow: () => void;
  hydrateFromDraft: (step: WorkflowStep, completed: WorkflowStep[]) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      currentStep: 'analyze',
      completedSteps: [],
      stepErrors: {},
      setCurrentStep: (currentStep) => set({ currentStep }),
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
      hydrateFromDraft: (currentStep, completedSteps) =>
        set({
          currentStep,
          completedSteps,
        }),
    }),
    {
      name: 'swedish-secondhand-ai:workflow',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
      }),
    },
  ),
);
