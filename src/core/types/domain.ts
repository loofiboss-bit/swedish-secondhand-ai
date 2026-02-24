export type SupportedLanguage = 'sv' | 'en';

export type MarketplaceSite = 'tradera' | 'blocket' | 'vinted';

export type ConditionGrade = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';

export interface ItemFingerprint {
  title: string;
  category: string;
  brand: string;
  model: string;
  conditionGrade: ConditionGrade;
  attributes: Record<string, string>;
  detectedLanguage: SupportedLanguage;
  confidence: number;
}

export interface ComparableRecord {
  id: string;
  source: 'tradera' | 'manual';
  site: MarketplaceSite;
  title: string;
  priceSek: number;
  soldAt: string;
  conditionHint: string;
  url: string;
  similarityScore: number;
}

export interface ValuationResult {
  priceMinSek: number;
  priceRecommendedSek: number;
  priceMaxSek: number;
  confidence: number;
  rationale: string;
  compsUsed: ComparableRecord[];
}

export interface ListingTemplate {
  site: MarketplaceSite;
  title: string;
  description: string;
  priceSuggestionSek: number;
  shippingSuggestion: string;
  tags: string[];
  disclaimer: string;
}

export interface ComparableQuery {
  title: string;
  category?: string;
  brand?: string;
  model?: string;
  limit?: number;
}

export interface ListingTemplateInput {
  site: MarketplaceSite;
  fingerprint: ItemFingerprint;
  valuation: ValuationResult;
}

export interface MarketplaceAdapter {
  getComparables(criteria: ComparableQuery): Promise<ComparableRecord[]>;
  renderTemplate(input: ListingTemplateInput): ListingTemplate;
}

export interface ValuationService {
  analyzeInput(text: string, images: string[]): Promise<ItemFingerprint>;
  estimateValue(fingerprint: ItemFingerprint, comps: ComparableRecord[]): Promise<ValuationResult>;
}

export interface AppSettings {
  language: SupportedLanguage;
  currency: 'SEK';
  geminiApiKey: string;
  traderaApiKey: string;
  traderaBaseUrl: string;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  fingerprint: ItemFingerprint;
  valuation: ValuationResult;
  templates: ListingTemplate[];
}
