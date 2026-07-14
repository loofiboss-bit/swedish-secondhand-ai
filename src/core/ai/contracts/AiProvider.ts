import type { AiProviderCapabilities } from './AiCapabilities';
import type {
  ComparableReviewRequest,
  ItemAnalysisRequest,
  ListingGenerationRequest,
  ProviderHealthRequest,
} from './AiRequests';
import type {
  AiProviderHealthStatus,
  ComparableReviewResponse,
  ItemAnalysisResponse,
  ListingGenerationResponse,
} from './AiResponses';

export type AiProviderId = 'openai' | 'gemini' | 'ollama' | 'openai-compatible';

export interface AiProvider {
  readonly id: AiProviderId;
  readonly capabilities: AiProviderCapabilities;
  analyzeItem?(request: ItemAnalysisRequest): Promise<ItemAnalysisResponse>;
  generateListing?(request: ListingGenerationRequest): Promise<ListingGenerationResponse>;
  reviewComparables?(request: ComparableReviewRequest): Promise<ComparableReviewResponse>;
  checkHealth?(request: ProviderHealthRequest): Promise<AiProviderHealthStatus>;
}
