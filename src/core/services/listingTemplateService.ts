import type {
  ItemFingerprint,
  ListingTemplate,
  MarketplaceSite,
  PricedValuationResult,
} from '@core/types';

const siteLabel: Record<MarketplaceSite, string> = {
  tradera: 'Tradera',
  blocket: 'Blocket',
  vinted: 'Vinted',
};

const titleLimits: Record<MarketplaceSite, number> = {
  tradera: 80,
  blocket: 70,
  vinted: 60,
};

class ListingTemplateService {
  private static instance: ListingTemplateService;

  static getInstance(): ListingTemplateService {
    if (!ListingTemplateService.instance) {
      ListingTemplateService.instance = new ListingTemplateService();
    }
    return ListingTemplateService.instance;
  }

  generateTemplates(
    fingerprint: ItemFingerprint,
    valuation: PricedValuationResult,
  ): ListingTemplate[] {
    return (['tradera', 'blocket', 'vinted'] as const).map((site) =>
      this.renderTemplate(site, fingerprint, valuation),
    );
  }

  exportCopyBundle(template: ListingTemplate): string {
    return [
      `Site: ${siteLabel[template.site]}`,
      `Title: ${template.title}`,
      `Price: ${template.priceSuggestionSek} SEK`,
      `Tags: ${template.tags.join(', ')}`,
      '',
      template.description,
      '',
      `Shipping: ${template.shippingSuggestion}`,
      `Note: ${template.disclaimer}`,
    ].join('\n');
  }

  private renderTemplate(
    site: MarketplaceSite,
    fingerprint: ItemFingerprint,
    valuation: PricedValuationResult,
  ): ListingTemplate {
    const title = `${fingerprint.brand} ${fingerprint.title}`.trim().slice(0, titleLimits[site]);

    const bullets = [
      `Kategori: ${fingerprint.category}`,
      `Skick: ${fingerprint.conditionGrade}`,
      `Varumärke: ${fingerprint.brand}`,
      `Modell: ${fingerprint.model}`,
      `Prisstrategi: ${valuation.pricingStrategy}`,
    ];

    const siteSpecific =
      site === 'tradera'
        ? 'Betalning och leverans enligt Tradera-standard. Ange tydliga fraktvillkor.'
        : site === 'blocket'
          ? 'Kan hämtas lokalt eller skickas inom Sverige efter överenskommelse.'
          : 'Frakt via Vinted-systemet rekommenderas för trygg handel.';

    return {
      site,
      title,
      description: `${title}\n\n${bullets.join('\n')}\n\n${siteSpecific}`,
      priceSuggestionSek: valuation.priceRecommendedSek,
      shippingSuggestion:
        site === 'blocket'
          ? 'Hämtning eller spårbar frakt inom Sverige.'
          : 'Spårbar frakt inom Sverige.',
      tags: [fingerprint.category, fingerprint.brand, siteLabel[site]].filter(
        (entry) => entry && entry !== 'Unknown',
      ),
      disclaimer:
        'Prisförslag är en uppskattning. Kontrollera aktuella jämförbara annonser innan publicering.',
    };
  }
}

export const listingTemplateService = ListingTemplateService.getInstance();
