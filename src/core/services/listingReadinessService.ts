import type {
  ListingDraftFieldKey,
  ListingReadinessIssue,
  MarketplaceListingDraft,
} from '@core/types';
import { listingTemplateService } from './listingTemplateService';
import { sitePolicyService } from './sitePolicyService';

const POLICY_FIELD: Record<string, ListingDraftFieldKey> = {
  title: 'title',
  description: 'description',
  price: 'priceSek',
  tags: 'tags',
};

export function assessListingReadiness(draft: MarketplaceListingDraft): ListingReadinessIssue[] {
  const policy = sitePolicyService.validate(draft.site, listingTemplateService.toTemplate(draft));
  const issues: ListingReadinessIssue[] = policy.issues.map((issue) => ({
    id: issue.constraintId,
    severity: issue.severity === 'error' ? 'blocker' : 'warning',
    field: POLICY_FIELD[issue.field] ?? 'description',
    message: issue.message,
  }));
  if (!draft.fields.category.value.trim()) {
    issues.push({
      id: 'category-empty',
      severity: 'blocker',
      field: 'category',
      message: 'Select and verify a marketplace category.',
    });
  }
  if (!draft.fields.shippingPickup.value.trim()) {
    issues.push({
      id: 'fulfillment-empty',
      severity: 'blocker',
      field: 'shippingPickup',
      message: 'Add shipping or pickup terms.',
    });
  }
  if (draft.imageOrder.length === 0 || draft.coverImageIndex === null) {
    issues.push({
      id: 'cover-missing',
      severity: 'improvement',
      field: 'images',
      message: 'Select a cover image before copying the package.',
    });
  }
  if (draft.fields.attributes.value.length === 0) {
    issues.push({
      id: 'attributes-empty',
      severity: 'improvement',
      field: 'attributes',
      message: 'Review marketplace attributes before publishing.',
    });
  }
  return issues;
}

export const listingReadinessService = { assess: assessListingReadiness };
