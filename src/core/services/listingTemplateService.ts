import type {
  ListingTemplate,
  MarketplaceSite,
  PricedValuationResult,
  VerifiedProductFacts,
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

function reviewedList(values: string[], unknownText: string): string {
  return values.length > 0 ? values.join(', ') : unknownText;
}

class ListingTemplateService {
  private static instance: ListingTemplateService;

  static getInstance(): ListingTemplateService {
    if (!ListingTemplateService.instance) {
      ListingTemplateService.instance = new ListingTemplateService();
    }
    return ListingTemplateService.instance;
  }

  generateTemplates(
    facts: VerifiedProductFacts,
    valuation: PricedValuationResult,
  ): ListingTemplate[] {
    return (['tradera', 'blocket', 'vinted'] as const).map((site) =>
      this.renderTemplate(site, facts, valuation),
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
    facts: VerifiedProductFacts,
    valuation: PricedValuationResult,
  ): ListingTemplate {
    const title = `${facts.brand.value} ${facts.title.value}`.trim().slice(0, titleLimits[site]);
    const testing =
      facts.testedStatus.value === 'tested'
        ? 'Testad av säljaren'
        : facts.testedStatus.value === 'untested'
          ? 'Otestad'
          : 'Teststatus inte verifierad';
    const authenticity =
      facts.authenticityStatus.value === 'verified'
        ? 'Verifierad av säljaren'
        : facts.authenticityStatus.value === 'unverified'
          ? 'Inte verifierad'
          : 'Äkthet inte verifierad';
    const bullets = [
      `Kategori: ${facts.category.value}`,
      `Skick: ${facts.conditionGrade.value}`,
      `Varumärke: ${facts.brand.value}`,
      `Modell: ${facts.model.value}`,
      `Defekter: ${reviewedList(facts.defects.value, 'Inte fullständigt verifierat — inspektera före publicering')}`,
      `Tillbehör som ingår: ${reviewedList(facts.includedAccessories.value, 'Inte verifierat')}`,
      `Tillbehör som saknas: ${reviewedList(facts.missingAccessories.value, 'Inte verifierat')}`,
      `Teststatus: ${testing}`,
      `Äkthet: ${authenticity}`,
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
      tags: [facts.category.value, facts.brand.value, siteLabel[site]].filter(
        (entry) => entry && entry !== 'Unknown',
      ),
      disclaimer:
        'Prisförslag är en uppskattning. Kontrollera fakta och aktuella jämförelser innan publicering.',
    };
  }
}

export const listingTemplateService = ListingTemplateService.getInstance();
