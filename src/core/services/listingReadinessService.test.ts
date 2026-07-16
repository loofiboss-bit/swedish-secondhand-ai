import { describe, expect, it } from 'vitest';
import type { ListingTemplate } from '@core/types';
import { listingTemplateService } from './listingTemplateService';
import { assessListingReadiness } from './listingReadinessService';

const template: ListingTemplate = {
  site: 'tradera',
  title: 'Sony A6400 kamerahus',
  description: 'Detaljerad beskrivning av skick, defekter, tillbehör, frakt och hämtning.'.repeat(
    3,
  ),
  priceSuggestionSek: 5_000,
  shippingSuggestion: 'Spårbar frakt',
  tags: ['Sony', 'A6400'],
  disclaimer: 'Kontrollera fakta.',
};

describe('listingReadinessService', () => {
  it('returns actionable issue groups with target fields instead of a generic score', () => {
    const draft = listingTemplateService.draftFromLegacyTemplate(template);
    const issues = assessListingReadiness(draft);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'blocker', field: 'category' }),
        expect.objectContaining({ severity: 'improvement', field: 'images' }),
      ]),
    );
  });
});
