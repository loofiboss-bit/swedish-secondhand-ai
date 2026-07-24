import type {
  ComparableRecord,
  FactCandidate,
  ItemFingerprint,
  ListingTemplate,
} from '@core/types';
import type { AiProviderCapabilities } from './AiCapabilities';
import type { AiProviderId } from './AiProvider';

export interface AiResponseMetadata {
  readonly providerId: AiProviderId;
  readonly modelId?: string;
  readonly durationMs?: number;
}

export interface ItemAnalysisResponse {
  readonly fingerprint: ItemFingerprint;
  readonly candidates: readonly FactCandidate[];
  readonly metadata: AiResponseMetadata;
}

export interface ListingGenerationResponse {
  readonly template: ListingTemplate;
  readonly metadata: AiResponseMetadata;
}

export interface ComparableReviewDecision {
  readonly comparableId: ComparableRecord['id'];
  readonly relevant: boolean;
  readonly confidence: number;
  readonly reason: string;
}

export interface ComparableReviewResponse {
  readonly decisions: readonly ComparableReviewDecision[];
  readonly metadata: AiResponseMetadata;
}

export type AiProviderHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unconfigured';

export interface AiProviderHealthStatus {
  readonly providerId: AiProviderId;
  readonly state: AiProviderHealthState;
  readonly checkedAt: string;
  readonly latencyMs?: number;
  readonly message?: string;
  readonly capabilities?: AiProviderCapabilities;
}
