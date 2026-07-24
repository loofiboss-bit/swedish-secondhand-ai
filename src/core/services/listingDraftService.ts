import { del } from 'idb-keyval';
import type { ListingDraft } from '@core/types';
import { logger } from './loggerService';
import { isVerifiedProductFacts, upgradeProductFacts } from './verifiedFactsService';

import { DATASET_KEYS, readVersionedDataset, writeVersionedDataset } from './persistenceService';

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ENCODED_IMAGE_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isUnitNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isItemFingerprint(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.attributes)) return false;
  return (
    isBoundedString(value.title, 2_000) &&
    isBoundedString(value.category, 2_000) &&
    isBoundedString(value.brand, 2_000) &&
    isBoundedString(value.model, 2_000) &&
    ['new', 'like_new', 'good', 'fair', 'poor', 'unknown'].includes(String(value.conditionGrade)) &&
    ['sv', 'en'].includes(String(value.detectedLanguage)) &&
    isUnitNumber(value.confidence) &&
    Object.entries(value.attributes).length <= 100 &&
    Object.entries(value.attributes).every(
      ([key, entry]) => key.length > 0 && key.length <= 100 && isBoundedString(entry, 2_000),
    )
  );
}

export function isComparableRecord(
  value: unknown,
): value is import('@core/types').ComparableRecord {
  if (!isRecord(value)) return false;
  const validOptionalDate = (entry: unknown) =>
    entry === undefined || (typeof entry === 'string' && Number.isFinite(Date.parse(entry)));
  return (
    isBoundedString(value.id, 300) &&
    ['tradera', 'manual'].includes(String(value.source)) &&
    ['tradera', 'blocket', 'vinted'].includes(String(value.site)) &&
    isBoundedString(value.title, 2_000) &&
    typeof value.priceSek === 'number' &&
    Number.isFinite(value.priceSek) &&
    value.priceSek > 0 &&
    value.priceSek <= 10_000_000 &&
    (value.priceKind === undefined ||
      ['asking', 'realized', 'unknown'].includes(String(value.priceKind))) &&
    (value.marketState === undefined ||
      ['active', 'sold', 'unknown'].includes(String(value.marketState))) &&
    typeof value.soldAt === 'string' &&
    Number.isFinite(Date.parse(value.soldAt)) &&
    validOptionalDate(value.observedAt) &&
    isBoundedString(value.url, 2_048) &&
    (!value.url || /^https?:\/\//i.test(value.url)) &&
    isBoundedString(value.conditionHint, 1_000) &&
    isUnitNumber(value.similarityScore) &&
    isUnitNumber(value.sourceQuality) &&
    (value.location === undefined || isBoundedString(value.location, 500)) &&
    (value.shippingIncluded === undefined || typeof value.shippingIncluded === 'boolean') &&
    (value.queryVariantIds === undefined ||
      (Array.isArray(value.queryVariantIds) &&
        value.queryVariantIds.length <= 5 &&
        value.queryVariantIds.every((id) => isBoundedString(id, 100)))) &&
    (value.hitType === undefined || ['exact', 'broad', 'manual'].includes(String(value.hitType))) &&
    (value.cacheAgeMs === undefined ||
      (typeof value.cacheAgeMs === 'number' &&
        Number.isFinite(value.cacheAgeMs) &&
        value.cacheAgeMs >= 0)) &&
    (value.decision === undefined ||
      (isRecord(value.decision) &&
        typeof value.decision.included === 'boolean' &&
        isBoundedString(value.decision.reason, 2_000) &&
        ['system', 'user'].includes(String(value.decision.decidedBy))))
  );
}

function isListingTemplate(value: unknown): boolean {
  return (
    isRecord(value) &&
    ['tradera', 'blocket', 'vinted'].includes(String(value.site)) &&
    isBoundedString(value.title, 2_000) &&
    isBoundedString(value.description, 20_000) &&
    typeof value.priceSuggestionSek === 'number' &&
    Number.isFinite(value.priceSuggestionSek) &&
    value.priceSuggestionSek >= 0 &&
    value.priceSuggestionSek <= 10_000_000 &&
    isBoundedString(value.shippingSuggestion, 2_000) &&
    Array.isArray(value.tags) &&
    value.tags.length <= 100 &&
    value.tags.every((tag) => isBoundedString(tag, 500)) &&
    isBoundedString(value.disclaimer, 5_000)
  );
}

function isValuationResult(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.confidenceBreakdown)) return false;
  const nullablePrice = (price: unknown) =>
    price === null ||
    (typeof price === 'number' && Number.isFinite(price) && price >= 0 && price <= 10_000_000);
  return (
    ['ready', 'low-confidence', 'insufficient-evidence'].includes(String(value.status)) &&
    nullablePrice(value.priceMinSek) &&
    nullablePrice(value.priceRecommendedSek) &&
    nullablePrice(value.priceMaxSek) &&
    isUnitNumber(value.confidence) &&
    isBoundedString(value.rationale, 5_000) &&
    ['fast_sale', 'balanced', 'max_value'].includes(String(value.pricingStrategy)) &&
    isUnitNumber(value.confidenceBreakdown.similarity) &&
    isUnitNumber(value.confidenceBreakdown.sampleSize) &&
    isUnitNumber(value.confidenceBreakdown.sourceQuality) &&
    typeof value.confidenceBreakdown.calibration === 'number' &&
    Number.isFinite(value.confidenceBreakdown.calibration) &&
    value.confidenceBreakdown.calibration >= 0 &&
    value.confidenceBreakdown.calibration <= 10 &&
    Array.isArray(value.compsUsed) &&
    value.compsUsed.length <= 500 &&
    value.compsUsed.every(isComparableRecord) &&
    Array.isArray(value.adjustments) &&
    value.adjustments.length <= 50 &&
    value.adjustments.every(
      (adjustment) =>
        isRecord(adjustment) &&
        isBoundedString(adjustment.id, 200) &&
        isBoundedString(adjustment.label, 500) &&
        typeof adjustment.factor === 'number' &&
        Number.isFinite(adjustment.factor) &&
        adjustment.factor >= 0 &&
        adjustment.factor <= 10 &&
        typeof adjustment.amountSek === 'number' &&
        Number.isFinite(adjustment.amountSek) &&
        isBoundedString(adjustment.reason, 2_000),
    ) &&
    (value.action === undefined || isBoundedString(value.action, 2_000)) &&
    (value.status === 'insufficient-evidence'
      ? value.priceMinSek === null &&
        value.priceRecommendedSek === null &&
        value.priceMaxSek === null
      : typeof value.priceMinSek === 'number' &&
        typeof value.priceRecommendedSek === 'number' &&
        typeof value.priceMaxSek === 'number')
  );
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

function isComparableQueryPlan(value: unknown): boolean {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.variants)) return false;
  return (
    typeof value.generatedAt === 'string' &&
    Number.isFinite(Date.parse(value.generatedAt)) &&
    value.variants.length <= 5 &&
    value.variants.every(
      (variant) =>
        isRecord(variant) &&
        typeof variant.id === 'string' &&
        variant.id.length <= 100 &&
        ['exact', 'broad'].includes(String(variant.type)) &&
        typeof variant.query === 'string' &&
        variant.query.length <= 160 &&
        typeof variant.enabled === 'boolean' &&
        typeof variant.userEdited === 'boolean',
    )
  );
}

function isOwnedField(value: unknown, kind: 'string' | 'number' | 'strings'): boolean {
  if (!isRecord(value)) return false;
  const fieldValue = value.value;
  const validValue =
    kind === 'string'
      ? typeof fieldValue === 'string' && fieldValue.length <= 20_000
      : kind === 'number'
        ? typeof fieldValue === 'number' && Number.isFinite(fieldValue) && fieldValue >= 0
        : Array.isArray(fieldValue) &&
          fieldValue.length <= 100 &&
          fieldValue.every((entry) => typeof entry === 'string' && entry.length <= 500);
  return (
    validValue &&
    ['generated', 'user'].includes(String(value.origin)) &&
    typeof value.userEdited === 'boolean'
  );
}

function isMarketplaceListingDraft(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.fields) || !Array.isArray(value.imageOrder)) return false;
  const fields = value.fields;
  return (
    value.version === 1 &&
    ['tradera', 'blocket', 'vinted'].includes(String(value.site)) &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    isOwnedField(fields.title, 'string') &&
    isOwnedField(fields.description, 'string') &&
    isOwnedField(fields.priceSek, 'number') &&
    isOwnedField(fields.category, 'string') &&
    isOwnedField(fields.attributes, 'strings') &&
    isOwnedField(fields.shippingPickup, 'string') &&
    isOwnedField(fields.tags, 'strings') &&
    isOwnedField(fields.disclosure, 'string') &&
    value.imageOrder.length <= 6 &&
    value.imageOrder.every((index) => Number.isInteger(index) && Number(index) >= 0) &&
    new Set(value.imageOrder).size === value.imageOrder.length &&
    (value.coverImageIndex === null ||
      (Number.isInteger(value.coverImageIndex) && value.imageOrder.includes(value.coverImageIndex)))
  );
}

function isSellPlan(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.rationale) || !Array.isArray(value.basis))
    return false;
  return (
    value.version === 1 &&
    typeof value.generatedAt === 'string' &&
    Number.isFinite(Date.parse(value.generatedAt)) &&
    ['tradera', 'blocket', 'vinted'].includes(String(value.marketplace)) &&
    ['fixed-price', 'auction'].includes(String(value.saleFormat)) &&
    ['fast_sale', 'balanced', 'max_value'].includes(String(value.pricingStrategy)) &&
    ['shipping', 'pickup', 'shipping-or-pickup'].includes(String(value.fulfillment)) &&
    value.rationale.length <= 20 &&
    value.rationale.every(
      (reason) =>
        isRecord(reason) &&
        typeof reason.key === 'string' &&
        reason.key.length <= 200 &&
        (reason.params === undefined || isRecord(reason.params)),
    ) &&
    value.basis.every((basis) =>
      ['market-data', 'general-rule', 'own-history'].includes(String(basis)),
    )
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
        value.photoAssessments.every(isPhotoAssessment))) &&
    (value.comparableQueryPlan === undefined || isComparableQueryPlan(value.comparableQueryPlan)) &&
    (value.listingDrafts === undefined ||
      (Array.isArray(value.listingDrafts) &&
        value.listingDrafts.length <= 3 &&
        value.listingDrafts.every(isMarketplaceListingDraft))) &&
    (value.sellerTimePreference === undefined ||
      ['fast', 'balanced', 'patient'].includes(String(value.sellerTimePreference))) &&
    (value.sellPlan === undefined || isSellPlan(value.sellPlan)) &&
    (value.selectedMarketplace === undefined ||
      ['tradera', 'blocket', 'vinted'].includes(String(value.selectedMarketplace))) &&
    (value.localLearningSampleSize === undefined ||
      (Number.isInteger(value.localLearningSampleSize) &&
        Number(value.localLearningSampleSize) >= 0 &&
        Number(value.localLearningSampleSize) <= 10_000))
  );
}

function hasListingDraftShape(value: unknown): value is ListingDraft {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Partial<ListingDraft>;
  return (
    draft.version === 1 &&
    typeof draft.savedAt === 'string' &&
    Number.isFinite(Date.parse(draft.savedAt)) &&
    ['analyze', 'comparables', 'price', 'templates', 'review'].includes(
      String(draft.currentStep),
    ) &&
    Array.isArray(draft.completedSteps) &&
    draft.completedSteps.length <= 5 &&
    draft.completedSteps.every((step) =>
      ['analyze', 'comparables', 'price', 'templates', 'review'].includes(String(step)),
    ) &&
    new Set(draft.completedSteps).size === draft.completedSteps.length &&
    ['fast_sale', 'balanced', 'max_value'].includes(String(draft.pricingStrategy)) &&
    isBoundedString(draft.inputText, 20_000) &&
    Array.isArray(draft.images) &&
    draft.images.length <= MAX_IMAGES &&
    draft.images.every(
      (image) =>
        typeof image === 'string' &&
        image.length <= MAX_ENCODED_IMAGE_LENGTH + 40 &&
        /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(image),
    ) &&
    Array.isArray(draft.traderaComps) &&
    draft.traderaComps.length <= 500 &&
    draft.traderaComps.every(isComparableRecord) &&
    Array.isArray(draft.manualComps) &&
    draft.manualComps.length <= 500 &&
    draft.manualComps.every(isComparableRecord) &&
    (draft.fingerprint === null || isItemFingerprint(draft.fingerprint)) &&
    (draft.valuation === null || isValuationResult(draft.valuation)) &&
    Array.isArray(draft.templates) &&
    draft.templates.length <= 3 &&
    draft.templates.every(isListingTemplate)
  );
}

function hasConsistentImageReferences(value: ListingDraft): boolean {
  const imageCount = value.images.length;
  const assessments = value.photoAssessments ?? [];
  const listingDrafts = value.listingDrafts ?? [];
  const candidateReferences = (value.factCandidates ?? []).flatMap(
    (candidate) => candidate.references,
  );
  return (
    new Set(assessments.map((assessment) => assessment.imageIndex)).size === assessments.length &&
    assessments.every(
      (assessment) =>
        assessment.imageIndex < imageCount &&
        (assessment.duplicateOfIndex === undefined || assessment.duplicateOfIndex < imageCount),
    ) &&
    new Set(listingDrafts.map((draft) => draft.site)).size === listingDrafts.length &&
    (value.selectedMarketplace === undefined ||
      listingDrafts.some((draft) => draft.site === value.selectedMarketplace)) &&
    listingDrafts.every(
      (draft) =>
        draft.imageOrder.every((imageIndex) => imageIndex < imageCount) &&
        (draft.coverImageIndex === null || draft.coverImageIndex < imageCount),
    ) &&
    candidateReferences.every(
      (reference) => reference.kind !== 'image' || Number(reference.index) < imageCount,
    )
  );
}

export function isListingDraft(value: unknown): value is ListingDraft {
  return (
    hasListingDraftShape(value) &&
    hasValidSmartIntake(value) &&
    hasConsistentImageReferences(value) &&
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
