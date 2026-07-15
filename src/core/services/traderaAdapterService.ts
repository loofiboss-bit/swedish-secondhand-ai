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

    try {
      const response = await getDesktopBridge().marketplace.fetchTraderaComparables({
        baseUrl: settings.traderaBaseUrl,
        query: criteria.title,
        category: criteria.category,
        limit: criteria.limit ?? 20,
      });
      if (!response.configured || !isTraderaApiResponse(response.data)) return [];
      const raw = response.data;
      const items = raw.items ?? raw.results ?? raw.endedItems ?? [];

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
    return {
      site: 'tradera',
      title: input.fingerprint.title.slice(0, 80),
      description: `${input.fingerprint.title}\n\nSkick: ${input.fingerprint.conditionGrade}\nKategori: ${input.fingerprint.category}\nPrisstrategi: ${input.valuation.pricingStrategy}`,
      priceSuggestionSek: input.valuation.priceRecommendedSek,
      shippingSuggestion: 'Skickas spårbart inom Sverige.',
      tags: [input.fingerprint.category, input.fingerprint.brand].filter(
        (entry) => entry !== 'Unknown',
      ),
      disclaimer: 'Prisforslag baserat pa historiska jamforelser och manuell granskning.',
    };
  }
}

export const traderaAdapterService = TraderaAdapterService.getInstance();
