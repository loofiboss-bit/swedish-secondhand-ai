import { GoogleGenAI } from '@google/genai';
import type { ConditionGrade, ItemFingerprint, SupportedLanguage } from '@core/types';
import { settingsService } from './settingsService';
import { extractJson, safeJsonParse, clamp } from '@core/utils/json';
import { logger } from './loggerService';

interface GeminiAnalysisResponse {
  title?: string;
  category?: string;
  brand?: string;
  model?: string;
  conditionGrade?: ConditionGrade;
  attributes?: Record<string, string>;
  detectedLanguage?: SupportedLanguage;
  confidence?: number;
}

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
    if (!settings.geminiApiKey) {
      return this.fallbackFingerprint(contentText);
    }

    try {
      const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
      const imageParts = images.slice(0, 2).flatMap((dataUrl) => {
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
        if (!mimeMatch) return [];
        const mimeType = mimeMatch[1];
        const data = dataUrl.replace(/^data:[^;]+;base64,/, '');
        return [{ inlineData: { mimeType, data } }];
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              text: `Analyze this Swedish secondhand item and return ONLY JSON with fields: title, category, brand, model, conditionGrade, attributes (object), detectedLanguage (sv|en), confidence (0-1). Text description: ${contentText || 'No text provided'}`,
            },
            ...imageParts,
          ],
        },
      });

      const parsed = safeJsonParse<GeminiAnalysisResponse>(extractJson(response.text ?? ''));
      if (!parsed) {
        return this.fallbackFingerprint(contentText);
      }

      return {
        title: parsed.title?.trim() || this.buildTitle(contentText),
        category: parsed.category?.trim() || 'General',
        brand: parsed.brand?.trim() || inferBrand(contentText),
        model: parsed.model?.trim() || 'Unknown',
        conditionGrade: parsed.conditionGrade ?? inferCondition(contentText),
        attributes: parsed.attributes ?? {},
        detectedLanguage: parsed.detectedLanguage ?? inferLanguage(contentText),
        confidence: clamp(parsed.confidence ?? 0.65, 0, 1),
      };
    } catch (error) {
      logger.warn('Gemini analysis failed. Falling back to heuristic analysis.', error);
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
