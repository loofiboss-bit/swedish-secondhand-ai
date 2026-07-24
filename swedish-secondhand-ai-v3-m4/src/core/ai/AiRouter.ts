import type {
  AiProviderHealthStatus,
  AiProviderId,
  ItemAnalysisRequest,
  ItemAnalysisResponse,
  ProviderHealthRequest,
} from './contracts';
import { AiProviderError } from './contracts';
import type { AiProviderRegistry } from './AiProviderRegistry';

export class AiRouter {
  constructor(private readonly registry: AiProviderRegistry) {}

  async analyzeItem(
    providerId: AiProviderId,
    request: ItemAnalysisRequest,
  ): Promise<ItemAnalysisResponse> {
    const provider = this.registry.get(providerId);
    if (!provider.capabilities.itemAnalysis || !provider.analyzeItem) {
      throw new AiProviderError(`AI provider "${providerId}" cannot analyze items.`, {
        code: 'unsupported_capability',
        providerId,
      });
    }
    return provider.analyzeItem(request);
  }

  async checkHealth(
    providerId: AiProviderId,
    request: ProviderHealthRequest = {},
  ): Promise<AiProviderHealthStatus> {
    const provider = this.registry.get(providerId);
    if (!provider.capabilities.healthCheck || !provider.checkHealth) {
      throw new AiProviderError(`AI provider "${providerId}" has no health check.`, {
        code: 'unsupported_capability',
        providerId,
      });
    }
    return provider.checkHealth(request);
  }
}

export function canUseHeuristicFallback(error: unknown): error is AiProviderError {
  return (
    error instanceof AiProviderError &&
    ['rate_limit', 'timeout', 'network', 'invalid_response', 'schema_validation'].includes(
      error.code,
    )
  );
}
