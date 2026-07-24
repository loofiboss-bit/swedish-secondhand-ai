import { clear } from 'idb-keyval';
import { Blob as NodeBlob } from 'node:buffer';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListingDraft } from '@core/types';
import { PROJECT_STORE } from '@core/services/projectRepository';

const { loadDraftMock } = vi.hoisted(() => ({ loadDraftMock: vi.fn() }));

vi.mock('@core/services/listingDraftService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@core/services/listingDraftService')>();

  return {
    ...actual,
    listingDraftService: {
      ...actual.listingDraftService,
      loadDraft: loadDraftMock,
      saveDraft: vi.fn(),
      clearDraft: vi.fn(),
    },
  };
});

import { App } from './App';
import { useListingStore } from '@core/store/useListingStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';

const draftFixture: ListingDraft = {
  version: 1,
  savedAt: '2026-02-26T12:00:00.000Z',
  currentStep: 'templates',
  completedSteps: ['analyze', 'comparables', 'price'],
  pricingStrategy: 'balanced',
  inputText: 'Draft: IKEA Poang in very good condition',
  images: ['data:image/png;base64,dGVzdA=='],
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

describe('App schema 3 project migration', () => {
  afterEach(cleanup);

  beforeEach(async () => {
    Object.defineProperty(globalThis, 'Blob', { configurable: true, value: NodeBlob });
    await clear();
    await clear(PROJECT_STORE);
    localStorage.clear();
    vi.clearAllMocks();
    loadDraftMock.mockResolvedValue(draftFixture);
    useProjectStore.setState({
      status: 'idle',
      projects: [],
      activeProjectId: null,
      activeProject: null,
      error: null,
    });
    useWorkflowStore.getState().resetWorkflow();
    useListingStore.getState().clear();
    useValuationStore.setState({
      inputText: '',
      images: [],
      pricingStrategy: 'balanced',
      fingerprint: null,
      productFacts: null,
      traderaComps: [],
      manualComps: [],
      valuation: null,
      loading: false,
      error: null,
    });
  });

  it('shows a migrated legacy draft as a project and hydrates it on explicit open', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole(
        'button',
        { name: /börja offline|start offline/i },
        { timeout: 10_000 },
      ),
    );

    const projectButton = await screen.findByRole(
      'button',
      { name: /^Draft: IKEA Poang in very good condition/ },
      { timeout: 5_000 },
    );
    await user.click(projectButton);

    await waitFor(() =>
      expect(useValuationStore.getState().inputText).toBe(draftFixture.inputText),
    );
    expect(useWorkflowStore.getState().currentStep).toBe('templates');
    expect(useListingStore.getState().templates).toEqual(draftFixture.templates);
    expect(useValuationStore.getState().images).toEqual(draftFixture.images);
  }, 20_000);
});
