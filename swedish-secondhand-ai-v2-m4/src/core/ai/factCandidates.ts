import type { ItemAnalysisRequest } from './contracts';
import type {
  AnalysisKnowledgeGap,
  FactCandidate,
  FactCandidateSource,
  ItemFingerprint,
} from '@core/types';

function uncertainty(confidence: number): FactCandidate['uncertainty'] {
  if (confidence >= 0.8) return 'low';
  if (confidence >= 0.55) return 'medium';
  return 'high';
}

function normalizedCandidateValue(value: string): string | null {
  const normalized = value.trim();
  return normalized && !['unknown', 'unspecified item'].includes(normalized.toLowerCase())
    ? normalized
    : null;
}

export function buildFactCandidates(
  fingerprint: ItemFingerprint,
  request: Pick<ItemAnalysisRequest, 'text' | 'images'>,
  source: FactCandidateSource,
): FactCandidate[] {
  const references: FactCandidate['references'] = [];
  if (request.text.trim()) {
    references.push({ kind: 'text', excerpt: request.text.trim().slice(0, 120) });
  }
  request.images.forEach((_, index) => references.push({ kind: 'image', index }));

  const entries: Array<[string, string]> = [
    ['title', fingerprint.title],
    ['category', fingerprint.category],
    ['brand', fingerprint.brand],
    ['model', fingerprint.model],
    ['conditionGrade', fingerprint.conditionGrade],
    ...Object.entries(fingerprint.attributes).map(
      ([key, value]) => [`attributes.${key}`, value] as [string, string],
    ),
  ];
  const allowedOfflineKeys = new Set(['title', 'category', 'brand', 'conditionGrade']);

  return entries.flatMap(([key, rawValue]) => {
    if (source === 'offline' && !allowedOfflineKeys.has(key)) return [];
    const value = normalizedCandidateValue(rawValue);
    if (!value) return [];
    const confidence =
      source === 'offline' ? Math.min(fingerprint.confidence, 0.45) : fingerprint.confidence;
    return [
      {
        id: `${source}:${key}:${value.toLowerCase().replaceAll(/[^a-z0-9åäö]+/giu, '-')}`,
        key,
        value,
        source,
        confidence,
        uncertainty: uncertainty(confidence),
        references,
      },
    ];
  });
}

export function buildKnowledgeGaps(fingerprint: ItemFingerprint): AnalysisKnowledgeGap[] {
  const gaps: AnalysisKnowledgeGap[] = [];
  if (!normalizedCandidateValue(fingerprint.brand)) {
    gaps.push({ key: 'brand', reasonKey: 'knowledgeGap_brand' });
  }
  if (!normalizedCandidateValue(fingerprint.model)) {
    gaps.push({ key: 'model', reasonKey: 'knowledgeGap_model' });
  }
  if (fingerprint.conditionGrade === 'unknown') {
    gaps.push({ key: 'conditionGrade', reasonKey: 'knowledgeGap_condition' });
  }
  if (Object.keys(fingerprint.attributes).length === 0) {
    gaps.push({ key: 'attributes', reasonKey: 'knowledgeGap_attributes' });
  }
  return gaps;
}
