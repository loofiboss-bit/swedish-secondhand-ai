import { AiRouter, canUseHeuristicFallback, configureRuntimeAiProviders } from '@core/ai';
import { buildFactCandidates, buildKnowledgeGaps } from '@core/ai/factCandidates';
import type {
  ConditionGrade,
  ItemAnalysisResult,
  ItemFingerprint,
  SupportedLanguage,
} from '@core/types';
import { settingsService } from './settingsService';
import { logger } from './loggerService';

const KNOWN_BRANDS = ['IKEA', 'Apple', 'Samsung', 'Sony', 'Dyson', 'Bosch', 'Electrolux', 'Nike'];

function inferCondition(text: string): ConditionGrade {
  const normalized = text.toLowerCase();
  if (/\b(new|ny)\b/u.test(normalized)) return 'new';
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
  private readonly router: AiRouter;

  private constructor() {
    const registry = configureRuntimeAiProviders({
      createItemFallback: (request) => this.fallbackFingerprint(request.text),
    });
    this.router = new AiRouter(registry);
  }

  static getInstance(): ItemAnalysisService {
    if (!ItemAnalysisService.instance) {
      ItemAnalysisService.instance = new ItemAnalysisService();
    }
    return ItemAnalysisService.instance;
  }

  async analyzeInput(
    text: string,
    images: string[],
    signal?: AbortSignal,
  ): Promise<ItemAnalysisResult> {
    const contentText = text.trim();
    const hasImage = images.length > 0;

    if (!contentText && !hasImage) {
      return this.offlineResult('', images);
    }

    const settings = await settingsService.getSettings();
    if (signal?.aborted) throw new DOMException('Analysis cancelled.', 'AbortError');
    if (settings.aiMode === 'offline') return this.offlineResult(contentText, images);

    const providerId = settings.aiMode;
    try {
      const response = await this.router.analyzeItem(providerId, {
        text: contentText,
        images: images.map((dataUrl) => ({ dataUrl })),
        language: inferLanguage(contentText),
        context: { signal },
      });
      return {
        fingerprint: response.fingerprint,
        candidates: [...response.candidates],
        knowledgeGaps: buildKnowledgeGaps(response.fingerprint),
        mode: providerId,
      };
    } catch (error) {
      if (settings.fallbackEnabled && canUseHeuristicFallback(error)) {
        logger.warn('AI analysis unavailable. Falling back to heuristic analysis.', {
          providerId,
          errorCode: error.code,
        });
        return this.offlineResult(contentText, images);
      }
      throw error;
    }
  }

  private offlineResult(text: string, images: string[]): ItemAnalysisResult {
    const fingerprint = this.fallbackFingerprint(text);
    return {
      fingerprint,
      candidates: buildFactCandidates(
        fingerprint,
        { text, images: images.map((dataUrl) => ({ dataUrl })) },
        'offline',
      ),
      knowledgeGaps: buildKnowledgeGaps(fingerprint),
      mode: 'offline',
    };
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
