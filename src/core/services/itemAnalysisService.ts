import { AiProviderError, configureRuntimeAiProviders, type AiProviderRegistry } from '@core/ai';
import type { ConditionGrade, ItemFingerprint, SupportedLanguage } from '@core/types';
import { settingsService } from './settingsService';
import { logger } from './loggerService';
import { analyzeWithOllama } from './ollamaAnalysisProvider';

const KNOWN_BRANDS = ['IKEA', 'Apple', 'Samsung', 'Sony', 'Dyson', 'Bosch', 'Electrolux', 'Nike'];

function inferCondition(text: string): ConditionGrade {
  const normalized = text.toLowerCase();
  if (normalized.includes('new') || normalized.includes('ny')) return 'new';
  if (normalized.includes('like new') || normalized.includes('nyskick')) return 'like_new';
  if (normalized.includes('good') || normalized.includes('bra skick')) return 'good';
  if (normalized.includes('fair') || normalized.includes('ok skick')) return 'fair';
  if (normalized.includes('poor') || normalized.includes('sliten')) return 'poor';
  return 'unknown';
}

function inferLanguage(text: string): SupportedLanguage {
  const normalized = text.toLowerCase();
  const swedishHints = ['och', 'som', 'den', 'skick', 'farg', 'färg', 'storlek'];
  return swedishHints.some((word) => normalized.includes(word)) ? 'sv' : 'en';
}

function inferBrand(text: string): string {
  const match = KNOWN_BRANDS.find((brand) => text.toLowerCase().includes(brand.toLowerCase()));
  return match ?? 'Unknown';
}

class ItemAnalysisService {
  private static instance: ItemAnalysisService;
  private readonly providerRegistry: AiProviderRegistry;

  private constructor() {
    this.providerRegistry = configureRuntimeAiProviders({
      createItemFallback: (request) => this.fallbackFingerprint(request.text),
    });
  }

  static getInstance(): ItemAnalysisService {
    if (!ItemAnalysisService.instance) {
      ItemAnalysisService.instance = new ItemAnalysisService();
    }
    return ItemAnalysisService.instance;
  }

  async analyzeInput(text: string, images: string[]): Promise<ItemFingerprint> {
    const contentText = text.trim();
    const hasImage = images.length > 0;

    if (!contentText && !hasImage) {
      return this.fallbackFingerprint('');
    }

    const settings = await settingsService.getSettings();

    if (settings.aiProvider === 'ollama') {
      try {
        const partial = await analyzeWithOllama(contentText, images);
        return { ...this.fallbackFingerprint(contentText), ...partial };
      } catch (err) {
        logger.warn('Ollama analysis failed, using heuristics', { err });
        return this.fallbackFingerprint(contentText);
      }
    }

    if (!settings.geminiApiKey) {
      return this.fallbackFingerprint(contentText);
    }

    try {
      const provider = this.providerRegistry.get('gemini');
      if (!provider.analyzeItem) {
        throw new AiProviderError('Gemini does not support item analysis.', {
          code: 'unsupported_capability',
          providerId: 'gemini',
        });
      }

      const response = await provider.analyzeItem({
        text: contentText,
        images: images.map((dataUrl) => ({ dataUrl })),
        language: inferLanguage(contentText),
      });
      return response.fingerprint;
    } catch (error) {
      logger.warn('Gemini analysis failed. Falling back to heuristic analysis.', {
        providerId: 'gemini',
        errorCode: error instanceof AiProviderError ? error.code : 'unknown',
      });
      return this.fallbackFingerprint(contentText);
    }
  }

  private fallbackFingerprint(text: string): ItemFingerprint {
    return {
      title: this.buildTitle(text),
      category: this.inferCategory(text),
      brand: inferBrand(text),
      model: 'Unknown',
      conditionGrade: inferCondition(text),
      attributes: {},
      detectedLanguage: inferLanguage(text),
      confidence: text.trim() ? 0.45 : 0.2,
    };
  }

  private inferCategory(text: string): string {
    const normalized = text.toLowerCase();
    if (
      normalized.includes('sofa') ||
      normalized.includes('stol') ||
      normalized.includes('table')
    ) {
      return 'Furniture';
    }
    if (
      normalized.includes('iphone') ||
      normalized.includes('telefon') ||
      normalized.includes('laptop')
    ) {
      return 'Electronics';
    }
    if (
      normalized.includes('jacka') ||
      normalized.includes('shoe') ||
      normalized.includes('sneaker')
    ) {
      return 'Fashion';
    }
    return 'General';
  }

  private buildTitle(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return 'Unspecified item';
    return trimmed.slice(0, 80);
  }
}

export const itemAnalysisService = ItemAnalysisService.getInstance();
