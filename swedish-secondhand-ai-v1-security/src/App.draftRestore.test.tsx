import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListingDraft } from '@core/types';

const { loadDraftMock, saveDraftMock, clearDraftMock } = vi.hoisted(() => ({
  loadDraftMock: vi.fn(),
  saveDraftMock: vi.fn(),
  clearDraftMock: vi.fn(),
}));

vi.mock('@core/services/listingDraftService', () => ({
  listingDraftService: {
    loadDraft: loadDraftMock,
    saveDraft: saveDraftMock,
    clearDraft: clearDraftMock,
  },
}));

import { App } from './App';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';

const draftFixture: ListingDraft = {
  version: 1,
  savedAt: '2026-02-26T12:00:00.000Z',
  currentStep: 'templates',
  completedSteps: ['analyze', 'comparables', 'price'],
  pricingStrategy: 'balanced',
  inputText: 'Draft: IKEA Poang in very good condition',
  images: ['data:image/png;base64,test'],
  fingerprint: null,
  traderaComps: [],
  manualComps: [],
  valuation: null,
  templates: [
    {
      site: 'tradera',
      title: 'Draft listing title',
      description: 'Draft listing description',
      priceSuggestionSek: 420,
      shippingSuggestion: 'Pickup preferred',
      tags: ['ikea', 'poang'],
      disclaimer: 'Sold as-is',
    },
  ],
};

describe('App draft restore conflict behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    loadDraftMock.mockResolvedValue(draftFixture);
    saveDraftMock.mockResolvedValue(undefined);
    clearDraftMock.mockResolvedValue(undefined);

    useWorkflowStore.getState().resetWorkflow();
    useListingStore.getState().clear();
    useValuationStore.setState({
      inputText: '',
      images: [],
      pricingStrategy: 'balanced',
      fingerprint: null,
      traderaComps: [],
      manualComps: [],
      valuation: null,
      loading: false,
      error: null,
    });
  });

  it('resumes a draft in normal mode', async () => {
    render(<App />);

    const resumeButton = await screen.findByRole('button', { name: /resume draft|återuppta/i });
    await userEvent.click(resumeButton);

    await waitFor(() => {
      expect(useValuationStore.getState().inputText).toBe(draftFixture.inputText);
    });
    expect(useWorkflowStore.getState().currentStep).toBe('templates');
    expect(useListingStore.getState().templates).toEqual(draftFixture.templates);
  });

  it('replaces current session with draft in conflict mode', async () => {
    useValuationStore.getState().setInputText('Unsaved local work');

    render(<App />);

    const replaceButton = await screen.findByRole('button', {
      name: /replace with draft|ersätt med utkast/i,
    });
    await userEvent.click(replaceButton);

    await waitFor(() => {
      expect(useValuationStore.getState().inputText).toBe(draftFixture.inputText);
    });
    expect(useWorkflowStore.getState().currentStep).toBe('templates');
    expect(useListingStore.getState().templates).toEqual(draftFixture.templates);
  });

  it('keeps current session when user cancels draft replacement in conflict mode', async () => {
    useValuationStore.getState().setInputText('Keep this in-progress session');

    render(<App />);

    const keepSessionButton = await screen.findByRole('button', {
      name: /keep current session|behåll nuvarande session/i,
    });
    await userEvent.click(keepSessionButton);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: /keep current session|behåll nuvarande session/i,
        }),
      ).not.toBeInTheDocument();
    });

    expect(useValuationStore.getState().inputText).toBe('Keep this in-progress session');
    expect(clearDraftMock).not.toHaveBeenCalled();
  });

  it('discards pending draft when user chooses discard', async () => {
    loadDraftMock.mockResolvedValueOnce(draftFixture).mockResolvedValueOnce(null);

    render(<App />);

    const discardButton = await screen.findByRole('button', {
      name: /discard draft|förkasta/i,
    });
    await userEvent.click(discardButton);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: /discard draft|förkasta/i,
        }),
      ).not.toBeInTheDocument();
    });

    expect(clearDraftMock).toHaveBeenCalledTimes(1);
  });
});
