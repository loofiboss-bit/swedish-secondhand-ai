import { del } from 'idb-keyval';
import type { ListingDraft } from '@core/types';
import { logger } from './loggerService';
import { isVerifiedProductFacts, upgradeProductFacts } from './verifiedFactsService';

import { DATASET_KEYS, readVersionedDataset, writeVersionedDataset } from './persistenceService';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFactCandidate(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.references)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length <= 300 &&
    typeof value.key === 'string' &&
    value.key.length <= 100 &&
    typeof value.value === 'string' &&
    value.value.length <= 2_000 &&
    ['gemini', 'ollama', 'offline'].includes(String(value.source)) &&
    typeof value.confidence === 'number' &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    ['low', 'medium', 'high'].includes(String(value.uncertainty)) &&
    value.references.length <= 8 &&
    value.references.every(
      (reference) =>
        isRecord(reference) &&
        ['text', 'image'].includes(String(reference.kind)) &&
        (reference.index === undefined ||
          (Number.isInteger(reference.index) && Number(reference.index) >= 0)) &&
        (reference.excerpt === undefined ||
          (typeof reference.excerpt === 'string' && reference.excerpt.length <= 500)),
    )
  );
}

function isPhotoAssessment(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.issues)) return false;
  const validUnitMetric = (metric: unknown) =>
    typeof metric === 'number' && Number.isFinite(metric) && metric >= 0 && metric <= 1;
  return (
    value.version === 1 &&
    Number.isInteger(value.imageIndex) &&
    Number(value.imageIndex) >= 0 &&
    ['cover', 'angle', 'defect', 'label_model', 'accessories'].includes(String(value.role)) &&
    Number.isInteger(value.width) &&
    Number(value.width) > 0 &&
    Number(value.width) <= 12_000 &&
    Number.isInteger(value.height) &&
    Number(value.height) > 0 &&
    Number(value.height) <= 12_000 &&
    Number(value.width) * Number(value.height) <= 40_000_000 &&
    validUnitMetric(value.brightness) &&
    validUnitMetric(value.contrast) &&
    validUnitMetric(value.sharpness) &&
    typeof value.perceptualHash === 'string' &&
    /^[0-9a-f]{16}$/i.test(value.perceptualHash) &&
    (value.duplicateOfIndex === undefined ||
      (Number.isInteger(value.duplicateOfIndex) && Number(value.duplicateOfIndex) >= 0)) &&
    typeof value.cropRisk === 'boolean' &&
    value.issues.length <= 7 &&
    value.issues.every((issue) =>
      [
        'low_resolution',
        'too_dark',
        'too_bright',
        'low_contrast',
        'blurry',
        'duplicate',
        'crop_risk',
      ].includes(String(issue)),
    ) &&
    typeof value.assessedAt === 'string' &&
    Number.isFinite(Date.parse(value.assessedAt))
  );
}

function hasValidSmartIntake(value: Partial<ListingDraft>): boolean {
  return (
    (value.factCandidates === undefined ||
      (Array.isArray(value.factCandidates) &&
        value.factCandidates.length <= 100 &&
        value.factCandidates.every(isFactCandidate))) &&
    (value.knowledgeGaps === undefined ||
      (Array.isArray(value.knowledgeGaps) &&
        value.knowledgeGaps.length <= 100 &&
        value.knowledgeGaps.every(
          (gap) =>
            isRecord(gap) &&
            typeof gap.key === 'string' &&
            gap.key.length <= 100 &&
            typeof gap.reasonKey === 'string' &&
            gap.reasonKey.length <= 100,
        ))) &&
    (value.photoAssessments === undefined ||
      (Array.isArray(value.photoAssessments) &&
        value.photoAssessments.length <= 6 &&
        value.photoAssessments.every(isPhotoAssessment)))
  );
}

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
    hasValidSmartIntake(value) &&
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
