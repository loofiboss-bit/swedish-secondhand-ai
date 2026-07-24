import { beforeEach, describe, expect, it } from 'vitest';
import type { ListingTemplate } from '@core/types';
import { useListingStore } from './useListingStore';

const template: ListingTemplate = {
  site: 'blocket',
  title: 'Sony A6400 kamerahus',
  description: 'Detaljerad beskrivning med skick, tillbehör, frakt och hämtning.'.repeat(3),
  priceSuggestionSek: 5_000,
  shippingSuggestion: 'Hämtning eller spårbar frakt',
  tags: ['Sony', 'A6400'],
  disclaimer: 'Kontrollera fakta.',
};

describe('useListingStore', () => {
  beforeEach(() => useListingStore.getState().clear());

  it('marks edited fields as user-owned and exports the current structured package', () => {
    useListingStore.getState().setTemplates([template]);
    useListingStore.getState().updateListingField('blocket', 'title', 'Min Sony A6400');

    expect(useListingStore.getState().listingDrafts[0].fields.title).toEqual({
      value: 'Min Sony A6400',
      origin: 'user',
      userEdited: true,
    });
    expect(useListingStore.getState().exportCopyBundle('blocket')).toContain(
      'Title: Min Sony A6400',
    );
  });
});
