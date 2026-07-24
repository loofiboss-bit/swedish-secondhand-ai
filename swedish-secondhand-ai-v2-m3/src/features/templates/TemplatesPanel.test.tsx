import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../../core/config/i18n';
import { TemplatesPanel } from './TemplatesPanel';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';

describe('TemplatesPanel', () => {
  it('disables copy actions when template has blocking issues', () => {
    vi.spyOn(useValuationStore, 'getState').mockReturnValue({
      generateTemplates: vi.fn(),
    } as never);

    useWorkflowStore.setState({
      stepErrors: {},
      currentStep: 'templates',
      completedSteps: ['analyze', 'comparables', 'price'],
    } as never);

    useListingStore.setState({
      templates: [
        {
          site: 'tradera',
          title: 'Too long title that should fail because of rule maybe or missing fields',
          description: 'short',
          priceSuggestionSek: 120,
          shippingSuggestion: 'Tracked',
          tags: ['x'],
          disclaimer: 'test',
        },
      ],
      qualityReport: {
        tradera: {
          site: 'tradera',
          score: 12,
          publishReady: false,
          reasons: ['bad'],
          suggestions: ['fix'],
        },
      },
      siteValidation: {
        tradera: {
          site: 'tradera',
          pass: false,
          blockingIssues: 1,
          issues: [
            {
              constraintId: 'title-length-tradera',
              field: 'title',
              severity: 'error',
              message: 'Tradera title must be 80 characters or less.',
            },
          ],
        },
      },
      exportCopyBundle: vi.fn(() => 'bundle'),
      hasBlockingIssues: () => true,
    } as never);

    render(<TemplatesPanel />);

    const copyButtons = screen.getAllByRole('button', { name: /kopiera|copy/i });
    expect(copyButtons.length).toBeGreaterThanOrEqual(2);
    copyButtons.forEach((button) => expect(button).toBeDisabled());
  });
});
