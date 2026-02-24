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
});
