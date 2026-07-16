import { describe, expect, it } from 'vitest';
import { listingTemplateService } from './listingTemplateService';
import { factsFromFingerprint } from './verifiedFactsService';

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
const facts = factsFromFingerprint(fingerprint);

const valuation = {
  status: 'ready' as const,
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
  adjustments: [],
};

describe('listingTemplateService', () => {
  it('generates templates for all target marketplaces', () => {
    const templates = listingTemplateService.generateTemplates(facts, valuation);

    expect(templates).toHaveLength(3);
    expect(templates.map((item) => item.site).sort()).toEqual(['blocket', 'tradera', 'vinted']);
    templates.forEach((template) => {
      expect(template.priceSuggestionSek).toBe(450);
    });
  });

  it('exports copy bundles', () => {
    const [template] = listingTemplateService.generateTemplates(facts, valuation);
    const bundle = listingTemplateService.exportCopyBundle(template);

    expect(bundle).toContain('Site:');
    expect(bundle).toContain(template.title);
    expect(bundle).toContain('Price:');
  });

  it('preserves defects, missing accessories, and uncertainty in every template', () => {
    const reviewed = {
      ...facts,
      defects: { value: ['Cracked screen'], source: 'user' as const, locked: true },
      missingAccessories: { value: ['Charger'], source: 'user' as const, locked: true },
      testedStatus: { value: 'untested' as const, source: 'user' as const, locked: true },
      authenticityStatus: {
        value: 'unverified' as const,
        source: 'user' as const,
        locked: true,
      },
    };

    const templates = listingTemplateService.generateTemplates(reviewed, valuation);

    templates.forEach((template) => {
      expect(template.description).toContain('Cracked screen');
      expect(template.description).toContain('Charger');
      expect(template.description).toContain('Otestad');
      expect(template.description).toContain('Inte verifierad');
    });
  });

  it('states uncertainty instead of claiming an empty fact is verified', () => {
    const [template] = listingTemplateService.generateTemplates(facts, valuation);

    expect(template.description).toContain('Defekter: Inte fullständigt verifierat');
    expect(template.description).toContain('Äkthet: Äkthet inte verifierad');
  });

  it('regenerates only untouched fields unless replacement is explicit', () => {
    const generated = listingTemplateService.generateListingDrafts(
      facts,
      valuation,
      2,
      [],
      false,
      '2026-07-16T00:00:00Z',
    );
    const edited = generated.map((draft) =>
      draft.site === 'blocket'
        ? {
            ...draft,
            fields: {
              ...draft.fields,
              title: { value: 'Min egen rubrik', origin: 'user' as const, userEdited: true },
            },
          }
        : draft,
    );
    const nextValuation = { ...valuation, priceRecommendedSek: 525 };

    const preserved = listingTemplateService.generateListingDrafts(facts, nextValuation, 2, edited);
    expect(preserved.find((draft) => draft.site === 'blocket')?.fields).toMatchObject({
      title: { value: 'Min egen rubrik', userEdited: true },
      priceSek: { value: 525, userEdited: false },
    });

    const replaced = listingTemplateService.generateListingDrafts(
      facts,
      nextValuation,
      2,
      edited,
      true,
    );
    expect(replaced.find((draft) => draft.site === 'blocket')?.fields.title).toMatchObject({
      userEdited: false,
    });
  });
});
