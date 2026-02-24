import { describe, expect, it } from 'vitest';
import { sitePolicyService } from './sitePolicyService';

describe('sitePolicyService', () => {
  it('returns blocking issue for invalid title length', () => {
    const result = sitePolicyService.validate('vinted', {
      site: 'vinted',
      title: 'x'.repeat(80),
      description: 'Short',
      priceSuggestionSek: 100,
      shippingSuggestion: 'Tracked',
      tags: ['A'],
      disclaimer: 'test',
    });

    expect(result.blockingIssues).toBeGreaterThan(0);
    expect(result.pass).toBe(false);
  });

  it('passes valid template', () => {
    const result = sitePolicyService.validate('tradera', {
      site: 'tradera',
      title: 'IKEA Poang fåtölj i mycket bra skick',
      description:
        'IKEA Poang i mycket bra skick. Inga skador. Rökfritt hem. Säljes pga flytt. Kan skickas eller hämtas.',
      priceSuggestionSek: 550,
      shippingSuggestion: 'Tracked',
      tags: ['Furniture', 'IKEA'],
      disclaimer: 'test',
    });

    expect(result.blockingIssues).toBe(0);
  });
});
