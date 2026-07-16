export type SupportedLanguage = 'sv' | 'en';

export type MarketplaceSite = 'tradera' | 'blocket' | 'vinted';

export type ConditionGrade = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';

export type PricingStrategy = 'fast_sale' | 'balanced' | 'max_value';

export type WorkflowStep = 'analyze' | 'comparables' | 'price' | 'templates' | 'review';

export type SaleStatus = 'pending' | 'sold' | 'not_sold';

export type MarketPriceKind = 'asking' | 'realized' | 'unknown';

export type MarketState = 'active' | 'sold' | 'unknown';

export type FactSource = 'ai' | 'user' | 'heuristic';

export interface VerifiedFact<T> {
  value: T;
  source: FactSource;
  locked: boolean;
  evidence?: string;
}

export type ProductFactKey = 'title' | 'category' | 'brand' | 'model' | 'conditionGrade';
export type ProductListFactKey = 'defects' | 'includedAccessories' | 'missingAccessories';

export interface VerifiedProductFacts {
  schemaVersion: 2;
  title: VerifiedFact<string>;
  category: VerifiedFact<string>;
  brand: VerifiedFact<string>;
  model: VerifiedFact<string>;
  conditionGrade: VerifiedFact<ConditionGrade>;
  defects: VerifiedFact<string[]>;
  includedAccessories: VerifiedFact<string[]>;
  missingAccessories: VerifiedFact<string[]>;
  testedStatus: VerifiedFact<'tested' | 'untested' | 'unknown'>;
  authenticityStatus: VerifiedFact<'verified' | 'unverified' | 'unknown'>;
  attributes: Record<string, VerifiedFact<string>>;
}

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
  priceKind?: MarketPriceKind;
  marketState?: MarketState;
  observedAt?: string;
  conditionHint: string;
  url: string;
  similarityScore: number;
  sourceQuality: number;
  location?: string;
  shippingIncluded?: boolean;
  relevance?: {
    score: number;
    weight: number;
    factors: {
      title: number;
      category: number;
      brand: number;
      model: number;
      recency: number;
      sourceQuality: number;
    };
    reason: string;
  };
  decision?: {
    included: boolean;
    reason: string;
    decidedBy: 'system' | 'user';
  };
}

export interface ConfidenceBreakdown {
  similarity: number;
  sampleSize: number;
  sourceQuality: number;
  calibration: number;
}

export interface ValuationAdjustment {
  id: string;
  label: string;
  factor: number;
  amountSek: number;
  reason: string;
}

interface ValuationResultBase {
  confidence: number;
  rationale: string;
  pricingStrategy: PricingStrategy;
  confidenceBreakdown: ConfidenceBreakdown;
  compsUsed: ComparableRecord[];
  adjustments: ValuationAdjustment[];
}

export interface ReadyValuationResult extends ValuationResultBase {
  status: 'ready';
  priceMinSek: number;
  priceRecommendedSek: number;
  priceMaxSek: number;
}

export interface LowConfidenceValuationResult extends ValuationResultBase {
  status: 'low-confidence';
  priceMinSek: number;
  priceRecommendedSek: number;
  priceMaxSek: number;
  action: string;
}

export interface InsufficientEvidenceValuationResult extends ValuationResultBase {
  status: 'insufficient-evidence';
  priceMinSek: null;
  priceRecommendedSek: null;
  priceMaxSek: null;
  action: string;
}

export type PricedValuationResult = ReadyValuationResult | LowConfidenceValuationResult;
export type ValuationResult = PricedValuationResult | InsufficientEvidenceValuationResult;

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
  facts: VerifiedProductFacts;
  valuation: PricedValuationResult;
}

export interface MarketplaceAdapter {
  getComparables(criteria: ComparableQuery): Promise<ComparableRecord[]>;
  renderTemplate(input: ListingTemplateInput): ListingTemplate;
}

export interface ValuationService {
  analyzeInput(text: string, images: string[], signal?: AbortSignal): Promise<ItemFingerprint>;
  estimateValue(
    facts: VerifiedProductFacts,
    comps: ComparableRecord[],
    strategy?: PricingStrategy,
  ): Promise<ValuationResult>;
}

export interface AppSettings {
  language: SupportedLanguage;
  currency: 'SEK';
  traderaAppId?: number;
  aiMode: 'gemini' | 'ollama' | 'offline';
  fallbackEnabled: boolean;
  onboardingCompleted: boolean;
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
  productFacts?: VerifiedProductFacts | null;
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
