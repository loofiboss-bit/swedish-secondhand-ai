export type SupportedLanguage = 'sv' | 'en';

export type MarketplaceSite = 'tradera' | 'blocket' | 'vinted';

export type ConditionGrade = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';

export type PricingStrategy = 'fast_sale' | 'balanced' | 'max_value';

export type WorkflowStep = 'analyze' | 'comparables' | 'price' | 'templates' | 'review';

export type SaleStatus = 'pending' | 'sold' | 'not_sold';

export type ProjectStatus = 'draft' | 'ready' | 'listed' | 'sold' | 'paused';

export type ProjectSection = 'item' | 'market' | 'listing' | 'follow-up';

export type MarketPriceKind = 'asking' | 'realized' | 'unknown';

export type MarketState = 'active' | 'sold' | 'unknown';

export type ComparableHitType = 'exact' | 'broad' | 'manual';

export type FactSource = 'ai' | 'user' | 'heuristic';

export type SellerCategory = 'Electronics' | 'Fashion' | 'Furniture' | 'Collectibles' | 'General';

export type FactCandidateSource = 'gemini' | 'ollama' | 'offline';

export interface EvidenceReference {
  kind: 'text' | 'image';
  index?: number;
  excerpt?: string;
}

export interface FactCandidate {
  id: string;
  key: string;
  value: string;
  source: FactCandidateSource;
  confidence: number;
  uncertainty: 'low' | 'medium' | 'high';
  references: EvidenceReference[];
}

export interface AnalysisKnowledgeGap {
  key: string;
  reasonKey: string;
}

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

export interface ItemAnalysisResult {
  fingerprint: ItemFingerprint;
  candidates: FactCandidate[];
  knowledgeGaps: AnalysisKnowledgeGap[];
  mode: FactCandidateSource;
}

export type PhotoRole = 'cover' | 'angle' | 'defect' | 'label_model' | 'accessories';

export type PhotoIssue =
  | 'low_resolution'
  | 'too_dark'
  | 'too_bright'
  | 'low_contrast'
  | 'blurry'
  | 'duplicate'
  | 'crop_risk';

export interface PhotoAssessment {
  version: 1;
  imageIndex: number;
  role: PhotoRole;
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  perceptualHash: string;
  duplicateOfIndex?: number;
  cropRisk: boolean;
  issues: PhotoIssue[];
  assessedAt: string;
}

export interface EvidenceGap {
  id: string;
  key: string;
  severity: 'blocking' | 'recommended';
  reason: string;
  targetSection: ProjectSection;
  targetId?: string;
}

export type CoachActionKind =
  | 'safety'
  | 'facts'
  | 'photos'
  | 'comparables'
  | 'price'
  | 'listing'
  | 'follow-up';

export interface CoachAction {
  id: string;
  kind: CoachActionKind;
  priority: number;
  severity: 'blocking' | 'improvement';
  titleKey: string;
  reasonKey: string;
  impactKey: string;
  targetSection: ProjectSection;
  targetId?: string;
}

export interface MarketObservation {
  id: string;
  source: 'tradera' | 'manual';
  site: MarketplaceSite;
  title: string;
  priceSek: number;
  priceKind: MarketPriceKind;
  marketState: MarketState;
  observedAt?: string;
  url: string;
  queryVariantIds?: string[];
  hitType?: ComparableHitType;
  cacheAgeMs?: number;
}

export interface ComparableRecord extends MarketObservation {
  soldAt: string;
  conditionHint: string;
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

export interface ComparableQueryVariant {
  id: string;
  type: 'exact' | 'broad';
  query: string;
  enabled: boolean;
  userEdited: boolean;
}

export interface ComparableQueryPlan {
  version: 1;
  generatedAt: string;
  variants: ComparableQueryVariant[];
}

export interface ValuationScenario {
  strategy: PricingStrategy;
  result: ValuationResult;
}

export interface AskingPriceRange {
  count: number;
  minSek: number;
  medianSek: number;
  maxSek: number;
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
  variantId?: string;
  hitType?: Exclude<ComparableHitType, 'manual'>;
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
  analyzeInput(text: string, images: string[], signal?: AbortSignal): Promise<ItemAnalysisResult>;
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
  factCandidates?: FactCandidate[];
  knowledgeGaps?: AnalysisKnowledgeGap[];
  photoAssessments?: PhotoAssessment[];
  comparableQueryPlan?: ComparableQueryPlan;
  traderaComps: ComparableRecord[];
  manualComps: ComparableRecord[];
  valuation: ValuationResult | null;
  templates: ListingTemplate[];
}

export interface MediaAsset {
  version: 1;
  id: string;
  projectId: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  size: number;
  createdAt: string;
  contentHash: string;
  blob: Blob;
}

export type ProjectWorkspace = Omit<ListingDraft, 'images'> & {
  mediaIds: string[];
};

export interface ProjectOutcome {
  saleStatus: SaleStatus;
  soldPriceSek?: number;
  soldAt?: string;
}

export interface ItemProject {
  schemaVersion: 3;
  id: string;
  title: string;
  status: ProjectStatus;
  currentSection: ProjectSection;
  createdAt: string;
  updatedAt: string;
  workspace: ProjectWorkspace;
  outcome?: ProjectOutcome;
  migratedFrom?: 'listing-draft' | 'history';
}

export interface ProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  updatedAt: string;
  recommendedPriceSek: number | null;
  thumbnailMediaId?: string;
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
