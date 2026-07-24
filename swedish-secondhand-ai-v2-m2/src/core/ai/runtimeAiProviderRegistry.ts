import type { ItemFingerprint } from '@core/types';
import { settingsService } from '@core/services/settingsService';
import type { ItemAnalysisRequest } from './contracts';
import { aiProviderRegistry, type AiProviderRegistry } from './AiProviderRegistry';
import { DEFAULT_GEMINI_MODEL, GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';
import { createDesktopGeminiClient } from '@core/platform/desktopBridge';

export interface RuntimeAiProviderOptions {
  readonly createItemFallback: (request: ItemAnalysisRequest) => ItemFingerprint;
}

export function configureRuntimeAiProviders(options: RuntimeAiProviderOptions): AiProviderRegistry {
  if (!aiProviderRegistry.has('gemini')) {
    aiProviderRegistry.register(
      new GeminiProvider({
        resolveConfig: async () => ({
          apiKey: 'desktop-managed',
          modelId: DEFAULT_GEMINI_MODEL,
        }),
        createFallback: options.createItemFallback,
        createClient: createDesktopGeminiClient,
      }),
    );
  }

  if (!aiProviderRegistry.has('ollama')) {
    aiProviderRegistry.register(
      new OllamaProvider({
        resolveConfig: async () => {
          const settings = await settingsService.getSettings();
          return {
            baseUrl: settings.ollamaBaseUrl ?? '',
            modelId: settings.ollamaModel ?? '',
          };
        },
        createFallback: options.createItemFallback,
      }),
    );
  }

  return aiProviderRegistry;
}
