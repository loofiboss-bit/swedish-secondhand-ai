import { describe, expect, it } from 'vitest';
import type { AiProvider, AiProviderCapabilities, AiProviderId } from './contracts';
import { AiProviderError } from './contracts';
import { AiProviderRegistry } from './AiProviderRegistry';

const capabilities: AiProviderCapabilities = {
  itemAnalysis: true,
  imageInput: true,
  listingGeneration: false,
  comparableReview: false,
  healthCheck: true,
};

function createProvider(id: AiProviderId): AiProvider {
  return { id, capabilities };
}

describe('AiProviderRegistry', () => {
  it('returns a registered provider', () => {
    const provider = createProvider('gemini');
    const registry = new AiProviderRegistry([provider]);

    expect(registry.get('gemini')).toBe(provider);
    expect(registry.has('gemini')).toBe(true);
  });

  it('rejects duplicate registration with a typed deterministic error', () => {
    const registry = new AiProviderRegistry([createProvider('ollama')]);

    expect(() => registry.register(createProvider('ollama'))).toThrowError(
      expect.objectContaining<Partial<AiProviderError>>({
        name: 'AiProviderError',
        code: 'provider_already_registered',
        providerId: 'ollama',
        retryable: false,
      }),
    );
  });

  it('returns a typed error for an unknown provider', () => {
    const registry = new AiProviderRegistry();

    expect(() => registry.get('openai')).toThrowError(
      expect.objectContaining<Partial<AiProviderError>>({
        name: 'AiProviderError',
        code: 'provider_not_found',
        providerId: 'openai',
      }),
    );
  });

  it('returns an immutable capability snapshot', () => {
    const registry = new AiProviderRegistry([createProvider('gemini')]);
    const snapshot = registry.getCapabilities('gemini');

    expect(snapshot).toEqual(capabilities);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot).not.toBe(capabilities);
  });

  it('lists providers in a stable order', () => {
    const registry = new AiProviderRegistry([
      createProvider('openai-compatible'),
      createProvider('ollama'),
      createProvider('gemini'),
      createProvider('openai'),
    ]);

    expect(registry.list().map((provider) => provider.id)).toEqual([
      'gemini',
      'ollama',
      'openai',
      'openai-compatible',
    ]);
  });
});
