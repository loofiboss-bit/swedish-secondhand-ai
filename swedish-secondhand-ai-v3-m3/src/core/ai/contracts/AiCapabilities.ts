export interface AiProviderCapabilities {
  readonly itemAnalysis: boolean;
  readonly imageInput: boolean;
  readonly listingGeneration: boolean;
  readonly comparableReview: boolean;
  readonly healthCheck: boolean;
}

export type AiCapabilityId = keyof AiProviderCapabilities;
