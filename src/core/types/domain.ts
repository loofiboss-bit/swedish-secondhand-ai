export type SupportedLanguage = 'sv' | 'en';

export type MarketplaceSite = 'tradera' | 'blocket' | 'vinted';

export type ConditionGrade = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';

export type PricingStrategy = 'fast_sale' | 'balanced' | 'max_value';

export type WorkflowStep = 'analyze' | 'comparables' | 'price' | 'templates' | 'review';

export type SaleStatus = 'pending' | 'sold' | 'not_sold';

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
  sourceQuality: number;
  location?: string;
  shippingIncluded?: boolean;
}

export interface ConfidenceBreakdown {
  similarity: number;
  sampleSize: number;
  sourceQuality: number;
  calibration: number;
}

export interface ValuationResult {
  priceMinSek: number;
  priceRecommendedSek: number;
  priceMaxSek: number;
  confidence: number;
  rationale: string;
  pricingStrategy: PricingStrategy;
  confidenceBreakdown: ConfidenceBreakdown;
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
  estimateValue(
    fingerprint: ItemFingerprint,
    comps: ComparableRecord[],
    strategy?: PricingStrategy,
  ): Promise<ValuationResult>;
}

export interface AppSettings {
  language: SupportedLanguage;
  currency: 'SEK';
  traderaBaseUrl: string;
  aiProvider?: 'gemini' | 'ollama';
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  secretStatus: AppSecretStatus;
}

export type SecretMigrationStatus = 'not-needed' | 'pending' | 'completed' | 'failed';

export interface AppSecretStatus {
  geminiConfigured: boolean;
  traderaConfigured: boolean;
  encryptionAvailable: boolean;
  storageBackend?: string;
  migrationStatus: SecretMigrationStatus;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  fingerprint: ItemFingerprint;
  valuation: ValuationResult;
  templates: ListingTemplate[];
  saleStatus: SaleStatus;
  soldPriceSek?: number;
  soldAt?: string;
}

export interface ListingDraft {
  version: 1;
  savedAt: string;
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  pricingStrategy: PricingStrategy;
  inputText: string;
  images: string[];
  fingerprint: ItemFingerprint | null;
  traderaComps: ComparableRecord[];
  manualComps: ComparableRecord[];
  valuation: ValuationResult | null;
  templates: ListingTemplate[];
}

export interface SiteConstraint {
  id: string;
  site: MarketplaceSite;
  field: 'title' | 'description' | 'tags' | 'price';
  severity: 'error' | 'warning';
  message: string;
  validate: (template: ListingTemplate) => boolean;
}

export interface PolicyIssue {
  constraintId: string;
  field: SiteConstraint['field'];
  severity: SiteConstraint['severity'];
  message: string;
}

export interface PolicyCheckResult {
  site: MarketplaceSite;
  pass: boolean;
  blockingIssues: number;
  issues: PolicyIssue[];
}

export interface QualityScoreReport {
  site: MarketplaceSite;
  score: number;
  publishReady: boolean;
  reasons: string[];
  suggestions: string[];
}
