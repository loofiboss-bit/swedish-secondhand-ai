import { clear, get, set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemFingerprint } from '@core/types';
import { isListingDraft, listingDraftService } from './listingDraftService';
import { DATASET_KEYS } from './persistenceService';
import { factsFromFingerprint } from './verifiedFactsService';

const fingerprint: ItemFingerprint = {
  title: 'Camera',
  category: 'Electronics',
  brand: 'Sony',
  model: 'A6000',
  conditionGrade: 'good',
  attributes: {},
  detectedLanguage: 'en',
  confidence: 0.8,
};

const baseDraft = {
  version: 1,
  savedAt: '2026-07-15T10:00:00.000Z',
  currentStep: 'analyze',
  completedSteps: [],
  pricingStrategy: 'balanced',
  inputText: 'Camera',
  images: [],
  fingerprint,
  traderaComps: [],
  manualComps: [],
  valuation: null,
  templates: [],
};

describe('listingDraftService migration', () => {
  beforeEach(async () => {
    await clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('upgrades current-main product facts and wraps the draft in schema 2', async () => {
    const legacyFacts = { ...factsFromFingerprint(fingerprint) } as Record<string, unknown>;
    delete legacyFacts.authenticityStatus;
    await set(DATASET_KEYS['listing-draft'], {
      ...baseDraft,
      productFacts: { ...legacyFacts, schemaVersion: 1 },
    });

    const draft = await listingDraftService.loadDraft();
    const envelope = await get<Record<string, unknown>>(DATASET_KEYS['listing-draft']);

    expect(draft?.productFacts).toMatchObject({
      schemaVersion: 2,
      authenticityStatus: { value: 'unknown', source: 'heuristic' },
    });
    expect(envelope).toMatchObject({ schemaVersion: 2, dataset: 'listing-draft' });
  });

  it('returns null without overwriting a corrupt draft', async () => {
    const corrupt = { version: 1, savedAt: 7 };
    await set(DATASET_KEYS['listing-draft'], corrupt);

    await expect(listingDraftService.loadDraft()).resolves.toBeNull();
    expect(await get(DATASET_KEYS['listing-draft'])).toEqual(corrupt);
  });

  it('rejects unsafe imported photo metrics and oversized candidate values', () => {
    expect(
      isListingDraft({
        ...baseDraft,
        photoAssessments: [
          {
            version: 1,
            imageIndex: 0,
            role: 'cover',
            width: 50_000,
            height: 50_000,
            brightness: 0.5,
            contrast: 0.5,
            sharpness: 0.5,
            perceptualHash: 'aaaaaaaaaaaaaaaa',
            cropRisk: false,
            issues: [],
            assessedAt: '2026-07-16T00:00:00Z',
          },
        ],
      }),
    ).toBe(false);
    expect(
      isListingDraft({
        ...baseDraft,
        factCandidates: [
          {
            id: 'candidate',
            key: 'title',
            value: 'x'.repeat(2_001),
            source: 'offline',
            confidence: 0.4,
            uncertainty: 'high',
            references: [],
          },
        ],
      }),
    ).toBe(false);
  });
});
