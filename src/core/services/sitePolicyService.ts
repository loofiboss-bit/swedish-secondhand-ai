import type {
  MarketplaceSite,
  MarketplacePolicyMetadata,
  PolicyCheckResult,
  SiteConstraint,
  ListingTemplate,
} from '@core/types';

const CONSTRAINTS: SiteConstraint[] = [
  {
    id: 'title-length-tradera',
    site: 'tradera',
    field: 'title',
    severity: 'error',
    message: 'Tradera title must be 80 characters or less.',
    validate: (template) => template.title.trim().length > 4 && template.title.length <= 80,
  },
  {
    id: 'title-length-blocket',
    site: 'blocket',
    field: 'title',
    severity: 'error',
    message: 'Blocket title must be 70 characters or less.',
    validate: (template) => template.title.trim().length > 4 && template.title.length <= 70,
  },
  {
    id: 'title-length-vinted',
    site: 'vinted',
    field: 'title',
    severity: 'error',
    message: 'Vinted title must be 60 characters or less.',
    validate: (template) => template.title.trim().length > 4 && template.title.length <= 60,
  },
  {
    id: 'description-min',
    site: 'tradera',
    field: 'description',
    severity: 'warning',
    message: 'Description should include enough detail for buyer trust.',
    validate: (template) => template.description.trim().length >= 120,
  },
  {
    id: 'description-min-blocket',
    site: 'blocket',
    field: 'description',
    severity: 'warning',
    message: 'Description should include enough detail for buyer trust.',
    validate: (template) => template.description.trim().length >= 100,
  },
  {
    id: 'description-min-vinted',
    site: 'vinted',
    field: 'description',
    severity: 'warning',
    message: 'Description should include enough detail for buyer trust.',
    validate: (template) => template.description.trim().length >= 90,
  },
  {
    id: 'tags-min',
    site: 'tradera',
    field: 'tags',
    severity: 'warning',
    message: 'At least 2 tags are recommended.',
    validate: (template) => template.tags.length >= 2,
  },
  {
    id: 'tags-min-blocket',
    site: 'blocket',
    field: 'tags',
    severity: 'warning',
    message: 'At least 2 tags are recommended.',
    validate: (template) => template.tags.length >= 2,
  },
  {
    id: 'tags-min-vinted',
    site: 'vinted',
    field: 'tags',
    severity: 'warning',
    message: 'At least 2 tags are recommended.',
    validate: (template) => template.tags.length >= 2,
  },
  {
    id: 'price-positive',
    site: 'tradera',
    field: 'price',
    severity: 'error',
    message: 'Price suggestion must be above 0 SEK.',
    validate: (template) => template.priceSuggestionSek > 0,
  },
  {
    id: 'price-positive-blocket',
    site: 'blocket',
    field: 'price',
    severity: 'error',
    message: 'Price suggestion must be above 0 SEK.',
    validate: (template) => template.priceSuggestionSek > 0,
  },
  {
    id: 'price-positive-vinted',
    site: 'vinted',
    field: 'price',
    severity: 'error',
    message: 'Price suggestion must be above 0 SEK.',
    validate: (template) => template.priceSuggestionSek > 0,
  },
];

const POLICY_METADATA: Record<MarketplaceSite, MarketplacePolicyMetadata> = {
  tradera: {
    site: 'tradera',
    version: '2026-07-24',
    sourceUrl: 'https://www.tradera.com/support/se/posts/annonsguide/',
    checkedAt: '2026-07-24T00:00:00.000Z',
  },
  blocket: {
    site: 'blocket',
    version: '2026-07-24',
    sourceUrl: 'https://www.blocket.se/villkor/villkor-privat/annonseringsregler',
    checkedAt: '2026-07-24T00:00:00.000Z',
  },
  vinted: {
    site: 'vinted',
    version: '2026-07-24',
    sourceUrl: 'https://www.vinted.se/help/392/551-information-till-saljare',
    checkedAt: '2026-07-24T00:00:00.000Z',
  },
};

class SitePolicyService {
  private static instance: SitePolicyService;

  static getInstance(): SitePolicyService {
    if (!SitePolicyService.instance) {
      SitePolicyService.instance = new SitePolicyService();
    }
    return SitePolicyService.instance;
  }

  listConstraints(site: MarketplaceSite): SiteConstraint[] {
    return CONSTRAINTS.filter((constraint) => constraint.site === site);
  }

  getMetadata(site: MarketplaceSite): MarketplacePolicyMetadata {
    return POLICY_METADATA[site];
  }

  validate(site: MarketplaceSite, template: ListingTemplate): PolicyCheckResult {
    const constraints = this.listConstraints(site);
    const issues = constraints
      .filter((constraint) => !constraint.validate(template))
      .map((constraint) => ({
        constraintId: constraint.id,
        field: constraint.field,
        severity: constraint.severity,
        message: constraint.message,
      }));

    return {
      site,
      pass: issues.length === 0,
      blockingIssues: issues.filter((issue) => issue.severity === 'error').length,
      issues,
    };
  }
}

export const sitePolicyService = SitePolicyService.getInstance();
