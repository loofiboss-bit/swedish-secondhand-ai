import { describe, expect, it } from 'vitest';
import { qualityScoreService } from './qualityScoreService';

describe('qualityScoreService', () => {
  it('scores and suggests fixes for weak template', () => {
    const report = qualityScoreService.scoreTemplate({
      site: 'blocket',
      title: 'x',
      description: 'short',
      priceSuggestionSek: 0,
      shippingSuggestion: 'none',
      tags: [],
      disclaimer: 'test',
    });

    expect(report.score).toBeLessThan(70);
    expect(report.suggestions.length).toBeGreaterThan(0);
    expect(report.publishReady).toBe(false);
  });
});
