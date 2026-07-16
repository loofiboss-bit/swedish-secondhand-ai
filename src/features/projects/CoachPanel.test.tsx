import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../core/config/i18n';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { CoachPanel } from './CoachPanel';

describe('CoachPanel', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useListingStore.getState().clear();
    useValuationStore.setState({
      productFacts: null,
      photoAssessments: [],
      traderaComps: [],
      manualComps: [],
      valuation: null,
    });
  });

  it('shows why the highest-priority action matters and opens its target', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CoachPanel projectStatus="draft" onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: /nästa bästa|next best/i })).toBeInTheDocument();
    expect(screen.getAllByText(/förväntad effekt|expected impact/i).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /öppna|open/i })[0]);
    expect(onNavigate).toHaveBeenCalledWith('item', 'item-analysis');
  });
});
