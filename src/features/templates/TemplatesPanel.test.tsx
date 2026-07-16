import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../core/config/i18n';
import { TemplatesPanel } from './TemplatesPanel';
import { useListingStore } from '@core/store/useListingStore';

describe('TemplatesPanel', () => {
  afterEach(() => {
    cleanup();
    useListingStore.getState().clear();
  });

  it('replaces a generic score with actionable groups and blocks copy on critical fields', () => {
    useListingStore.getState().setTemplates([
      {
        site: 'tradera',
        title: 'Too long title that should fail because of rule maybe or missing fields',
        description: 'short',
        priceSuggestionSek: 120,
        shippingSuggestion: 'Tracked',
        tags: ['x'],
        disclaimer: 'test',
      },
    ]);

    render(<TemplatesPanel />);

    expect(screen.getByRole('heading', { name: /blockerare|blockers/i })).toBeInTheDocument();
    const copyButtons = [
      ...document.querySelectorAll<HTMLButtonElement>('.template-actions button'),
    ];
    expect(copyButtons).toHaveLength(2);
    copyButtons.forEach((button) => expect(button).toBeDisabled());
    expect(screen.queryByText('/100')).not.toBeInTheDocument();
  });
});
