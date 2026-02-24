import type {
  ItemFingerprint,
  ListingTemplate,
  MarketplaceSite,
  ValuationResult,
} from '@core/types';

const siteLabel: Record<MarketplaceSite, string> = {
  tradera: 'Tradera',
  blocket: 'Blocket',
  vinted: 'Vinted',
};

class ListingTemplateService {
  private static instance: ListingTemplateService;

  static getInstance(): ListingTemplateService {
    if (!ListingTemplateService.instance) {
      ListingTemplateService.instance = new ListingTemplateService();
    }
    return ListingTemplateService.instance;
  }

  generateTemplates(fingerprint: ItemFingerprint, valuation: ValuationResult): ListingTemplate[] {
    return (['tradera', 'blocket', 'vinted'] as const).map((site) =>
      this.renderTemplate(site, fingerprint, valuation),
    );
  }

  private renderTemplate(
    site: MarketplaceSite,
    fingerprint: ItemFingerprint,
    valuation: ValuationResult,
  ): ListingTemplate {
    const titleLimit = site === 'vinted' ? 60 : 80;
    const title = `${fingerprint.brand} ${fingerprint.title}`.trim().slice(0, titleLimit);

    const bullets = [
      `Kategori: ${fingerprint.category}`,
      `Skick: ${fingerprint.conditionGrade}`,
      `Varumarke: ${fingerprint.brand}`,
      `Modell: ${fingerprint.model}`,
    ];

    const siteSpecific =
      site === 'tradera'
        ? 'Betalning och leverans enligt Tradera-standard.'
        : site === 'blocket'
          ? 'Kan hamtas lokalt eller skickas inom Sverige efter overenskommelse.'
          : 'Frakt via Vinted-systemet rekommenderas for trygg handel.';

    return {
      site,
      title,
      description: `${title}\n\n${bullets.join('\n')}\n\n${siteSpecific}`,
      priceSuggestionSek: valuation.priceRecommendedSek,
      shippingSuggestion: 'Spårbar frakt inom Sverige.',
      tags: [fingerprint.category, fingerprint.brand, siteLabel[site]].filter(
        (entry) => entry && entry !== 'Unknown',
      ),
      disclaimer:
        'Prisforslag ar en uppskattning. Kontrollera aktuella jamforbara annonser innan publicering.',
    };
  }
}

export const listingTemplateService = ListingTemplateService.getInstance();
