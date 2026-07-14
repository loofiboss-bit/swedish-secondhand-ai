import type { AiProvider, AiProviderCapabilities, AiProviderId } from './contracts';
import { AiProviderError } from './contracts';

export class AiProviderRegistry {
  private readonly providers = new Map<AiProviderId, AiProvider>();

  constructor(providers: readonly AiProvider[] = []) {
    providers.forEach((provider) => this.register(provider));
  }

  register(provider: AiProvider): void {
    if (this.providers.has(provider.id)) {
      throw new AiProviderError(`AI provider "${provider.id}" is already registered.`, {
        code: 'provider_already_registered',
        providerId: provider.id,
      });
    }

    this.providers.set(provider.id, provider);
  }

  get(providerId: AiProviderId): AiProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new AiProviderError(`AI provider "${providerId}" is not registered.`, {
        code: 'provider_not_found',
        providerId,
      });
    }

    return provider;
  }

  getCapabilities(providerId: AiProviderId): Readonly<AiProviderCapabilities> {
    return Object.freeze({ ...this.get(providerId).capabilities });
  }

  has(providerId: AiProviderId): boolean {
    return this.providers.has(providerId);
  }

  list(): readonly AiProvider[] {
    return [...this.providers.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}

export const aiProviderRegistry = new AiProviderRegistry();
