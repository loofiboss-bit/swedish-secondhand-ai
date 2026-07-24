import type {
  ListingTemplate,
  ListingOwnedField,
  MarketplaceListingDraft,
  MarketplaceSite,
  PriceDecision,
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
    priceDecision: PriceDecision = { kind: 'unset' },
  ): ListingTemplate[] {
    return (['tradera', 'blocket', 'vinted'] as const).map((site) =>
      this.renderTemplate(site, facts, priceDecision),
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

  generateListingDrafts(
    facts: VerifiedProductFacts,
    priceDecision: PriceDecision,
    imageCount: number,
    existing: MarketplaceListingDraft[] = [],
    replaceUserEdits = false,
    now = new Date().toISOString(),
  ): MarketplaceListingDraft[] {
    return this.generateTemplates(facts, priceDecision).map((template) => {
      const current = existing.find((draft) => draft.site === template.site);
      const generated = this.draftFromTemplate(template, facts, imageCount, now);
      if (!current) return generated;
      const merge = <T>(oldField: ListingOwnedField<T>, newField: ListingOwnedField<T>) =>
        oldField.userEdited && !replaceUserEdits ? oldField : newField;
      const validOrder = current.imageOrder.filter(
        (index, position, order) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < imageCount &&
          order.indexOf(index) === position,
      );
      const imageOrder = [
        ...validOrder,
        ...Array.from({ length: imageCount }, (_, index) => index).filter(
          (index) => !validOrder.includes(index),
        ),
      ];
      return {
        ...generated,
        fields: {
          title: merge<string>(current.fields.title, generated.fields.title),
          description: merge<string>(current.fields.description, generated.fields.description),
          priceSek: merge<number>(current.fields.priceSek, generated.fields.priceSek),
          category: merge<string>(current.fields.category, generated.fields.category),
          attributes: merge<string[]>(current.fields.attributes, generated.fields.attributes),
          shippingPickup: merge<string>(
            current.fields.shippingPickup,
            generated.fields.shippingPickup,
          ),
          tags: merge<string[]>(current.fields.tags, generated.fields.tags),
          disclosure: merge<string>(current.fields.disclosure, generated.fields.disclosure),
        },
        imageOrder,
        coverImageIndex:
          current.coverImageIndex !== null && current.coverImageIndex < imageCount
            ? current.coverImageIndex
            : generated.coverImageIndex,
      };
    });
  }

  draftFromLegacyTemplate(
    template: ListingTemplate,
    now = new Date().toISOString(),
  ): MarketplaceListingDraft {
    return this.draftFromTemplate(template, null, 0, now);
  }

  toTemplate(draft: MarketplaceListingDraft): ListingTemplate {
    return {
      site: draft.site,
      title: draft.fields.title.value,
      description: draft.fields.description.value,
      priceSuggestionSek: draft.fields.priceSek.value,
      shippingSuggestion: draft.fields.shippingPickup.value,
      tags: draft.fields.tags.value,
      disclaimer: draft.fields.disclosure.value,
    };
  }

  exportStructuredCopyPackage(draft: MarketplaceListingDraft): string {
    return [
      `Site: ${siteLabel[draft.site]}`,
      `Title: ${draft.fields.title.value}`,
      `Price: ${draft.fields.priceSek.value} SEK`,
      `Category: ${draft.fields.category.value}`,
      `Attributes: ${draft.fields.attributes.value.join(' | ') || 'Review in marketplace'}`,
      `Shipping/Pickup: ${draft.fields.shippingPickup.value}`,
      `Tags: ${draft.fields.tags.value.join(', ')}`,
      `Image order: ${draft.imageOrder.map((index) => index + 1).join(', ') || 'No images'}`,
      `Cover image: ${draft.coverImageIndex === null ? 'Not selected' : draft.coverImageIndex + 1}`,
      '',
      draft.fields.description.value,
      '',
      `Disclosure: ${draft.fields.disclosure.value}`,
    ].join('\n');
  }

  private draftFromTemplate(
    template: ListingTemplate,
    facts: VerifiedProductFacts | null,
    imageCount: number,
    now: string,
  ): MarketplaceListingDraft {
    const generated = <T>(value: T) => ({ value, origin: 'generated' as const, userEdited: false });
    return {
      version: 1,
      site: template.site,
      updatedAt: now,
      fields: {
        title: generated(template.title),
        description: generated(template.description),
        priceSek: generated(template.priceSuggestionSek),
        category: generated(facts?.category.value ?? ''),
        attributes: generated(
          facts
            ? Object.entries(facts.attributes).map(([key, fact]) => `${key}: ${fact.value}`)
            : [],
        ),
        shippingPickup: generated(template.shippingSuggestion),
        tags: generated(template.tags),
        disclosure: generated(template.disclaimer),
      },
      imageOrder: Array.from({ length: imageCount }, (_, index) => index),
      coverImageIndex: imageCount > 0 ? 0 : null,
    };
  }

  private renderTemplate(
    site: MarketplaceSite,
    facts: VerifiedProductFacts,
    priceDecision: PriceDecision,
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
      ...(priceDecision.kind === 'evidence_based'
        ? [`Prisstrategi: ${priceDecision.valuation.pricingStrategy}`]
        : []),
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
      priceSuggestionSek:
        priceDecision.kind === 'user_entered'
          ? priceDecision.amountSek
          : priceDecision.kind === 'evidence_based'
            ? priceDecision.valuation.priceRecommendedSek
            : 0,
      shippingSuggestion:
        site === 'blocket'
          ? 'Hämtning eller spårbar frakt inom Sverige.'
          : 'Spårbar frakt inom Sverige.',
      tags: [facts.category.value, facts.brand.value, siteLabel[site]].filter(
        (entry) => entry && entry !== 'Unknown',
      ),
      disclaimer:
        priceDecision.kind === 'evidence_based'
          ? 'Prisförslag är en evidensbaserad uppskattning. Kontrollera fakta och jämförelser före publicering.'
          : priceDecision.kind === 'user_entered'
            ? 'Priset har angetts av säljaren.'
            : 'Pris är inte valt ännu. Lägg till ett pris före publicering.',
    };
  }
}

export const listingTemplateService = ListingTemplateService.getInstance();
