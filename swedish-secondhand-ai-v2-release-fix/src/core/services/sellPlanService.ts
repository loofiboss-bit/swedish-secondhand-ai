import type {
  ComparableRecord,
  SellPlan,
  SellerTimePreference,
  ValuationResult,
  VerifiedProductFacts,
} from '@core/types';
import { normalizeSellerCategory } from './categoryProfileService';

export interface SellPlanInput {
  facts: VerifiedProductFacts;
  comparables: ComparableRecord[];
  valuation: ValuationResult | null;
  timePreference: SellerTimePreference;
  ownHistorySampleSize?: number;
}

export function createSellPlan(input: SellPlanInput, now = new Date().toISOString()): SellPlan {
  const category = normalizeSellerCategory(input.facts.category.value);
  const reviewedEvidence = input.comparables.filter(
    (comparable) =>
      comparable.priceKind === 'realized' &&
      comparable.decision?.included === true &&
      comparable.decision.decidedBy === 'user',
  ).length;
  const marketplace =
    category === 'Fashion'
      ? 'vinted'
      : category === 'Furniture'
        ? 'blocket'
        : category === 'Collectibles'
          ? 'tradera'
          : category === 'Electronics' && input.timePreference === 'fast'
            ? 'blocket'
            : 'tradera';
  const saleFormat =
    marketplace === 'tradera' && category === 'Collectibles' && input.timePreference !== 'fast'
      ? 'auction'
      : 'fixed-price';
  const pricingStrategy =
    input.timePreference === 'fast'
      ? 'fast_sale'
      : input.timePreference === 'patient'
        ? 'max_value'
        : 'balanced';
  const fulfillment = category === 'Furniture' ? 'pickup' : 'shipping-or-pickup';
  const rationale: SellPlan['rationale'] = [
    { key: 'sellPlanReason_marketplace', params: { marketplace, category } },
    { key: 'sellPlanReason_time', params: { pricingStrategy } },
    { key: 'sellPlanReason_evidence', params: { count: reviewedEvidence } },
    {
      key:
        category === 'Furniture'
          ? 'sellPlanReason_fulfillment_size'
          : 'sellPlanReason_fulfillment_flexibility',
    },
  ];
  if (!input.valuation || input.valuation.status === 'insufficient-evidence') {
    rationale.push({ key: 'sellPlanReason_insufficient' });
  }
  const basis: SellPlan['basis'] = ['general-rule'];
  if (reviewedEvidence > 0) basis.unshift('market-data');
  if ((input.ownHistorySampleSize ?? 0) >= 5) basis.push('own-history');

  return {
    version: 1,
    generatedAt: now,
    marketplace,
    saleFormat,
    pricingStrategy,
    fulfillment,
    rationale,
    basis,
  };
}

export const sellPlanService = { create: createSellPlan };
