import type {
  ComparableRecord,
  ItemFingerprint,
  MarketplaceSite,
  PricingStrategy,
  SupportedLanguage,
} from '@core/types';

export interface AiOperationContext {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly requestId?: string;
}

export interface AiImageInput {
  readonly dataUrl: string;
  readonly mediaType?: string;
}

export interface ItemAnalysisRequest {
  readonly text: string;
  readonly images: readonly AiImageInput[];
  readonly language?: SupportedLanguage;
  readonly context?: AiOperationContext;
}

export interface ListingGenerationRequest {
  readonly fingerprint: ItemFingerprint;
  readonly marketplace: MarketplaceSite;
  readonly pricingStrategy: PricingStrategy;
  readonly language: SupportedLanguage;
  readonly instructions?: string;
  readonly context?: AiOperationContext;
}

export interface ComparableReviewRequest {
  readonly fingerprint: ItemFingerprint;
  readonly comparables: readonly ComparableRecord[];
  readonly context?: AiOperationContext;
}

export interface ProviderHealthRequest {
  readonly context?: AiOperationContext;
}
