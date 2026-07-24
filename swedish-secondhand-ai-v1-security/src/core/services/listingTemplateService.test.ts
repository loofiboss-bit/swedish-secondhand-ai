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
  pricingStrategy: 'balanced' as const,
  confidenceBreakdown: {
    similarity: 0.8,
    sampleSize: 0.6,
    sourceQuality: 0.7,
    calibration: 1,
  },
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

  it('exports copy bundles', () => {
    const [template] = listingTemplateService.generateTemplates(fingerprint, valuation);
    const bundle = listingTemplateService.exportCopyBundle(template);

    expect(bundle).toContain('Site:');
    expect(bundle).toContain(template.title);
    expect(bundle).toContain('Price:');
  });
});
