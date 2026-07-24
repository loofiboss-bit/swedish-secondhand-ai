import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkflowStore } from './useWorkflowStore';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    useWorkflowStore.getState().resetWorkflow();
  });

  it('advances and rewinds steps', () => {
    useWorkflowStore.getState().nextStep();
    expect(useWorkflowStore.getState().currentStep).toBe('comparables');

    useWorkflowStore.getState().previousStep();
    expect(useWorkflowStore.getState().currentStep).toBe('analyze');
  });

  it('marks steps complete', () => {
    useWorkflowStore.getState().markStepComplete('analyze');
    expect(useWorkflowStore.getState().completedSteps).toContain('analyze');
  });

  it('does not duplicate completed steps', () => {
    useWorkflowStore.getState().markStepComplete('analyze');
    useWorkflowStore.getState().markStepComplete('analyze');

    expect(useWorkflowStore.getState().completedSteps).toEqual(['analyze']);
  });

  it('keeps boundaries when moving before first or after last step', () => {
    useWorkflowStore.getState().previousStep();
    expect(useWorkflowStore.getState().currentStep).toBe('analyze');

    useWorkflowStore.getState().setCurrentStep('review');
    useWorkflowStore.getState().nextStep();
    expect(useWorkflowStore.getState().currentStep).toBe('review');
  });

  it('ignores invalid runtime step assignments', () => {
    useWorkflowStore.getState().setCurrentStep('comparables');
    useWorkflowStore.getState().setCurrentStep('unknown-step' as never);

    expect(useWorkflowStore.getState().currentStep).toBe('comparables');
  });

  it('sanitizes invalid and inconsistent draft workflow state', () => {
    useWorkflowStore
      .getState()
      .hydrateFromDraft('price', ['analyze', 'invalid-step' as never, 'review', 'analyze']);

    expect(useWorkflowStore.getState().currentStep).toBe('price');
    expect(useWorkflowStore.getState().completedSteps).toEqual(['analyze']);
  });

  it('falls back to analyze when draft current step is invalid', () => {
    useWorkflowStore
      .getState()
      .hydrateFromDraft('broken-step' as never, ['review', 'comparables', 'analyze']);

    expect(useWorkflowStore.getState().currentStep).toBe('analyze');
    expect(useWorkflowStore.getState().completedSteps).toEqual(['analyze']);
  });
});
