import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import '../../core/config/i18n';
import { TemplatesPanel } from './TemplatesPanel';
import { useListingStore } from '@core/store/useListingStore';

describe('TemplatesPanel', () => {
  afterEach(() => {
    cleanup();
    useListingStore.getState().clear();
  });

  it('allows copying listing text but blocks the complete package on critical fields', () => {
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
    expect(copyButtons[0]).toBeDisabled();
    expect(copyButtons[1]).toBeEnabled();
    expect(screen.queryByText('/100')).not.toBeInTheDocument();
  });

  it('opens advanced details and focuses the exact field from a blocker action', async () => {
    const user = userEvent.setup();
    useListingStore.getState().setTemplates([
      {
        site: 'tradera',
        title: 'Sony A6400 kamerahus',
        description: 'Detaljerad beskrivning med skick, tillbehör, frakt och hämtning.'.repeat(3),
        priceSuggestionSek: 5_000,
        shippingSuggestion: 'Tracked',
        tags: ['Sony'],
        disclaimer: 'Review facts.',
      },
    ]);
    render(<TemplatesPanel />);

    await user.click(
      screen.getByRole('button', {
        name: /select and verify (?:the )?marketplace category|välj och verifiera.*kategori/i,
      }),
    );
    const category = screen.getByRole('textbox', {
      name: /category and attribute checklist|kategori.*attribut/i,
    });

    expect(category.closest('details')).toHaveAttribute('open');
    expect(category).toHaveFocus();
  });
});
