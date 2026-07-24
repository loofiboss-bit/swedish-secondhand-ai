import { del } from 'idb-keyval';
import type { ListingDraft } from '@core/types';
import { logger } from './loggerService';
import { isVerifiedProductFacts, upgradeProductFacts } from './verifiedFactsService';

import { DATASET_KEYS, readVersionedDataset, writeVersionedDataset } from './persistenceService';

function hasListingDraftShape(value: unknown): value is ListingDraft {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Partial<ListingDraft>;
  return (
    draft.version === 1 &&
    typeof draft.savedAt === 'string' &&
    typeof draft.currentStep === 'string' &&
    Array.isArray(draft.completedSteps) &&
    typeof draft.inputText === 'string' &&
    Array.isArray(draft.images) &&
    Array.isArray(draft.traderaComps) &&
    Array.isArray(draft.manualComps) &&
    Array.isArray(draft.templates)
  );
}

export function isListingDraft(value: unknown): value is ListingDraft {
  return (
    hasListingDraftShape(value) &&
    (value.productFacts === undefined ||
      value.productFacts === null ||
      isVerifiedProductFacts(value.productFacts))
  );
}

export function isListingDraftDataset(value: unknown): value is ListingDraft | null {
  return value === null || isListingDraft(value);
}

function migrateListingDraft(value: unknown): ListingDraft {
  if (!hasListingDraftShape(value)) throw new Error('Invalid legacy listing draft.');
  return {
    ...value,
    productFacts: value.fingerprint
      ? upgradeProductFacts(value.productFacts, value.fingerprint)
      : null,
  };
}

class ListingDraftService {
  private static instance: ListingDraftService;

  static getInstance(): ListingDraftService {
    if (!ListingDraftService.instance) {
      ListingDraftService.instance = new ListingDraftService();
    }
    return ListingDraftService.instance;
  }

  async saveDraft(draft: ListingDraft): Promise<void> {
    try {
      await writeVersionedDataset('listing-draft', draft);
    } catch (error) {
      logger.error('Failed to save listing draft', error);
    }
  }

  async loadDraft(): Promise<ListingDraft | null> {
    try {
      return (
        (await readVersionedDataset('listing-draft', isListingDraftDataset, migrateListingDraft)) ??
        null
      );
    } catch (error) {
      logger.error('Failed to load listing draft', error);
      return null;
    }
  }

  async clearDraft(): Promise<void> {
    try {
      await del(DATASET_KEYS['listing-draft']);
    } catch (error) {
      logger.error('Failed to clear listing draft', error);
    }
  }
}

export const listingDraftService = ListingDraftService.getInstance();
