import { AiProviderError } from '@core/ai/contracts';
import type { ConditionGrade, ItemFingerprint, SupportedLanguage } from '@core/types';
import { clamp, extractJson, safeJsonParse } from '@core/utils/json';

const CONDITION_GRADES = new Set<ConditionGrade>([
  'new',
  'like_new',
  'good',
  'fair',
  'poor',
  'unknown',
]);
const SUPPORTED_LANGUAGES = new Set<SupportedLanguage>(['sv', 'en']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizedString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizedAttributes(
  value: unknown,
  fallback: Record<string, string>,
): Record<string, string> {
  if (!isRecord(value)) return fallback;

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

export function parseGeminiAnalysisResponse(
  rawResponse: string,
  fallback: ItemFingerprint,
): ItemFingerprint {
  const parsed = safeJsonParse<unknown>(extractJson(rawResponse));
  if (!isRecord(parsed)) {
    throw new AiProviderError('Gemini returned an invalid structured response.', {
      code: 'invalid_response',
      providerId: 'gemini',
    });
  }

  const conditionGrade = CONDITION_GRADES.has(parsed.conditionGrade as ConditionGrade)
    ? (parsed.conditionGrade as ConditionGrade)
    : fallback.conditionGrade;
  const detectedLanguage = SUPPORTED_LANGUAGES.has(parsed.detectedLanguage as SupportedLanguage)
    ? (parsed.detectedLanguage as SupportedLanguage)
    : fallback.detectedLanguage;
  const confidence =
    typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? clamp(parsed.confidence, 0, 1)
      : 0.65;

  return {
    title: normalizedString(parsed.title, fallback.title),
    category: normalizedString(parsed.category, fallback.category),
    brand: normalizedString(parsed.brand, fallback.brand),
    model: normalizedString(parsed.model, fallback.model),
    conditionGrade,
    attributes: normalizedAttributes(parsed.attributes, fallback.attributes),
    detectedLanguage,
    confidence,
  };
}
