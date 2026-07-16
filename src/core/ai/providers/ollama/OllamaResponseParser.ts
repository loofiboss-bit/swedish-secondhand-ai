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
const MAX_STRING_LENGTH = 2_000;
const MAX_ATTRIBUTES = 50;
const MAX_ATTRIBUTE_KEY_LENGTH = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback: string): string {
  const normalized = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return normalized.slice(0, MAX_STRING_LENGTH);
}

function normalizeAttributes(
  value: unknown,
  fallback: Record<string, string>,
): Record<string, string> {
  if (!isRecord(value)) return fallback;

  const attributes = Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .slice(0, MAX_ATTRIBUTES)
      .map(([key, entryValue]) => [
        key.trim().slice(0, MAX_ATTRIBUTE_KEY_LENGTH),
        entryValue.trim().slice(0, MAX_STRING_LENGTH),
      ])
      .filter(([key, entryValue]) => Boolean(key) && Boolean(entryValue)),
  );
  return Object.keys(attributes).length > 0 ? attributes : fallback;
}

export function parseOllamaAnalysisResponse(
  rawResponse: string,
  fallback: ItemFingerprint,
): ItemFingerprint {
  const parsed = safeJsonParse<unknown>(extractJson(rawResponse));
  if (!isRecord(parsed)) {
    throw new AiProviderError('Ollama returned an invalid structured response.', {
      code: 'invalid_response',
      providerId: 'ollama',
    });
  }

  return {
    title: normalizeString(parsed.title, fallback.title),
    category: normalizeString(parsed.category, fallback.category),
    brand: normalizeString(parsed.brand, fallback.brand),
    model: normalizeString(parsed.model, fallback.model),
    conditionGrade: CONDITION_GRADES.has(parsed.conditionGrade as ConditionGrade)
      ? (parsed.conditionGrade as ConditionGrade)
      : fallback.conditionGrade,
    attributes: normalizeAttributes(parsed.attributes, fallback.attributes),
    detectedLanguage: SUPPORTED_LANGUAGES.has(parsed.detectedLanguage as SupportedLanguage)
      ? (parsed.detectedLanguage as SupportedLanguage)
      : fallback.detectedLanguage,
    confidence:
      typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? clamp(parsed.confidence, 0, 1)
        : fallback.confidence,
  };
}
