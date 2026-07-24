import { del, get, set } from 'idb-keyval';
import type { ListingDraft } from '@core/types';
import { logger } from './loggerService';

const DRAFT_KEY = 'swedish-secondhand-ai:listing-draft';

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
      await set(DRAFT_KEY, draft);
    } catch (error) {
      logger.error('Failed to save listing draft', error);
    }
  }

  async loadDraft(): Promise<ListingDraft | null> {
    try {
      return (await get<ListingDraft>(DRAFT_KEY)) ?? null;
    } catch (error) {
      logger.error('Failed to load listing draft', error);
      return null;
    }
  }

  async clearDraft(): Promise<void> {
    try {
      await del(DRAFT_KEY);
    } catch (error) {
      logger.error('Failed to clear listing draft', error);
    }
  }
}

export const listingDraftService = ListingDraftService.getInstance();
