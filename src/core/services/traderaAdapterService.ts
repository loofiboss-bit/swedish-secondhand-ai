import type {
  ComparableQuery,
  ComparableRecord,
  ListingTemplate,
  ListingTemplateInput,
  MarketplaceAdapter,
} from '@core/types';
import { settingsService } from './settingsService';
import { logger } from './loggerService';

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
}

interface TraderaApiResponse {
  items?: TraderaApiItem[];
  results?: TraderaApiItem[];
  endedItems?: TraderaApiItem[];
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
    if (!settings.traderaApiKey) {
      return [];
    }

    const payload = {
      query: criteria.title,
      category: criteria.category,
      limit: criteria.limit ?? 20,
      status: 'ended',
    };

    try {
      const response = await fetch(`${settings.traderaBaseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.traderaApiKey,
          Authorization: `Bearer ${settings.traderaApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.warn('Tradera comparables request failed', {
          status: response.status,
          statusText: response.statusText,
        });
        return [];
      }

      const raw = (await response.json()) as TraderaApiResponse;
      const items = raw.items ?? raw.results ?? raw.endedItems ?? [];

      return items
        .map((item, index) => {
          const title = item.title?.trim() || item.description?.trim() || 'Tradera item';
          const soldAt = item.soldAt ?? item.endDate ?? new Date().toISOString();
          const priceSek = normalizePrice(item);
          return {
            id: item.itemId ?? item.id ?? `tradera-${index}`,
            source: 'tradera' as const,
            site: 'tradera' as const,
            title,
            priceSek,
            soldAt,
            conditionHint: 'Unknown',
            url: item.url ?? 'https://www.tradera.com/',
            similarityScore: similarity(criteria.title, title),
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
      description: `${input.fingerprint.title}\n\nSkick: ${input.fingerprint.conditionGrade}\nKategori: ${input.fingerprint.category}`,
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
