import { describe, expect, it } from 'vitest';
import { listingTemplateService } from './listingTemplateService';

const fingerprint = {
  title: 'IKEA Poang Chair',
  category: 'Furniture',
  brand: 'IKEA',
  model: 'Poang',
  conditionGrade: 'good' as const,
  attributes: {},
  detectedLanguage: 'sv' as const,
  confidence: 0.8,
};

const valuation = {
  priceMinSek: 300,
  priceRecommendedSek: 450,
  priceMaxSek: 550,
  confidence: 0.7,
  rationale: 'test rationale',
  compsUsed: [],
};

describe('listingTemplateService', () => {
  it('generates templates for all target marketplaces', () => {
    const templates = listingTemplateService.generateTemplates(fingerprint, valuation);

    expect(templates).toHaveLength(3);
    expect(templates.map((item) => item.site).sort()).toEqual(['blocket', 'tradera', 'vinted']);
    templates.forEach((template) => {
      expect(template.priceSuggestionSek).toBe(450);
    });
  });
});
