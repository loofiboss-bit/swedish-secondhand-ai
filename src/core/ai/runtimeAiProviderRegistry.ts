import type { ItemFingerprint } from '@core/types';
import { settingsService } from '@core/services/settingsService';
import type { ItemAnalysisRequest } from './contracts';
import { aiProviderRegistry, type AiProviderRegistry } from './AiProviderRegistry';
import { DEFAULT_GEMINI_MODEL, GeminiProvider } from './providers/gemini';

export interface RuntimeAiProviderOptions {
  readonly createItemFallback: (request: ItemAnalysisRequest) => ItemFingerprint;
}

export function configureRuntimeAiProviders(options: RuntimeAiProviderOptions): AiProviderRegistry {
  if (!aiProviderRegistry.has('gemini')) {
    aiProviderRegistry.register(
      new GeminiProvider({
        resolveConfig: async () => {
          const settings = await settingsService.getSettings();
          return {
            apiKey: settings.geminiApiKey,
            modelId: DEFAULT_GEMINI_MODEL,
          };
        },
        createFallback: options.createItemFallback,
      }),
    );
  }

  return aiProviderRegistry;
}
