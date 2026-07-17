import type {
  ComparableQuery,
  ComparableRecord,
  ListingTemplate,
  ListingTemplateInput,
  MarketplaceAdapter,
} from '@core/types';
import { settingsService } from './settingsService';
import { logger } from './loggerService';
import { getDesktopBridge } from '@core/platform/desktopBridge';

interface TraderaApiItem {
  itemId?: string;
  id?: string;
  title?: string;
  description?: string;
  endDate?: string;
  soldAt?: string;
  finalPrice?: number;
  buyNowPrice?: number;
  price?: number;
  url?: string;
  shippingIncluded?: boolean;
  priceKind?: 'asking' | 'realized' | 'unknown';
  marketState?: 'active' | 'sold' | 'unknown';
}

interface TraderaApiResponse {
  items?: TraderaApiItem[];
  results?: TraderaApiItem[];
  endedItems?: TraderaApiItem[];
}

function isTraderaApiResponse(value: unknown): value is TraderaApiResponse {
  return typeof value === 'object' && value !== null;
}

function normalizePrice(item: TraderaApiItem): number {
  const candidate = item.finalPrice ?? item.price ?? item.buyNowPrice ?? 0;
  return Number.isFinite(candidate) ? Math.max(0, candidate) : 0;
}

function similarity(queryTitle: string, itemTitle: string): number {
  const qWords = new Set(queryTitle.toLowerCase().split(/\s+/).filter(Boolean));
  const iWords = new Set(itemTitle.toLowerCase().split(/\s+/).filter(Boolean));
  const common = [...qWords].filter((word) => iWords.has(word)).length;
  const denominator = Math.max(qWords.size, 1);
  return Math.min(1, common / denominator);
}

class TraderaAdapterService implements MarketplaceAdapter {
  private static instance: TraderaAdapterService;

  static getInstance(): TraderaAdapterService {
    if (!TraderaAdapterService.instance) {
      TraderaAdapterService.instance = new TraderaAdapterService();
    }
    return TraderaAdapterService.instance;
  }

  async getComparables(criteria: ComparableQuery): Promise<ComparableRecord[]> {
    const settings = await settingsService.getSettings();
    if (!settings.traderaAppId) {
      throw new Error('Configure a Tradera App ID before fetching comparables.');
    }

    try {
      const response = await getDesktopBridge().marketplace.fetchTraderaComparables({
        appId: settings.traderaAppId,
        query: criteria.title,
        limit: criteria.limit ?? 20,
      });
      if (!response.configured || !isTraderaApiResponse(response.data)) return [];
      const raw = response.data;
      const items = raw.items ?? raw.results ?? raw.endedItems ?? [];
      const observedAt = response.fetchedAt ?? new Date().toISOString();
      const cacheAgeMs = Math.max(0, Date.now() - Date.parse(observedAt));

      return items
        .map((item, index) => {
          const title = item.title?.trim() || item.description?.trim() || 'Tradera item';
          const soldAt = item.soldAt ?? item.endDate ?? new Date().toISOString();
          const priceSek = normalizePrice(item);
          const similarityScore = similarity(criteria.title, title);
          return {
            id: item.itemId ?? item.id ?? `tradera-${index}`,
            source: 'tradera' as const,
            site: 'tradera' as const,
            title,
            priceSek,
            soldAt,
            priceKind: item.priceKind ?? 'unknown',
            marketState: item.marketState ?? 'unknown',
            observedAt,
            cacheAgeMs: Number.isFinite(cacheAgeMs) ? cacheAgeMs : 0,
            queryVariantIds: criteria.variantId ? [criteria.variantId] : [],
            hitType: criteria.hitType ?? 'broad',
            conditionHint: 'Unknown',
            url: item.url ?? 'https://www.tradera.com/',
            similarityScore,
            sourceQuality: Math.max(0.6, similarityScore * 0.9),
            shippingIncluded: item.shippingIncluded,
          };
        })
        .filter((item) => item.priceSek > 0)
        .sort((a, b) => b.similarityScore - a.similarityScore);
    } catch (error) {
      logger.warn('Tradera request exception', error);
      return [];
    }
  }

  renderTemplate(input: ListingTemplateInput): ListingTemplate {
    const facts = input.facts;
    const price =
      input.priceDecision.kind === 'user_entered'
        ? input.priceDecision.amountSek
        : input.priceDecision.kind === 'evidence_based'
          ? input.priceDecision.valuation.priceRecommendedSek
          : 0;
    const strategy =
      input.priceDecision.kind === 'evidence_based'
        ? `\nPrisstrategi: ${input.priceDecision.valuation.pricingStrategy}`
        : '';
    return {
      site: 'tradera',
      title: facts.title.value.slice(0, 80),
      description: `${facts.title.value}\n\nSkick: ${facts.conditionGrade.value}\nKategori: ${facts.category.value}\nDefekter: ${facts.defects.value.join(', ') || 'Inte fullständigt verifierat'}\nSaknade tillbehör: ${facts.missingAccessories.value.join(', ') || 'Inte verifierat'}\nTeststatus: ${facts.testedStatus.value}\nÄkthet: ${facts.authenticityStatus.value}${strategy}`,
      priceSuggestionSek: price,
      shippingSuggestion: 'Skickas spårbart inom Sverige.',
      tags: [facts.category.value, facts.brand.value].filter((entry) => entry !== 'Unknown'),
      disclaimer: 'Prisforslag baserat pa historiska jamforelser och manuell granskning.',
    };
  }
}

export const traderaAdapterService = TraderaAdapterService.getInstance();
