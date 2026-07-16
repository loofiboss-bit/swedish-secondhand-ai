import { describe, expect, it } from 'vitest';
import type { ItemFingerprint } from '@core/types';
import { buildFactCandidates, buildKnowledgeGaps } from './factCandidates';

const fingerprint: ItemFingerprint = {
  title: 'Sony kamera',
  category: 'Electronics',
  brand: 'Sony',
  model: 'Unknown',
  conditionGrade: 'unknown',
  attributes: {},
  detectedLanguage: 'sv',
  confidence: 0.76,
};

describe('factCandidates', () => {
  it('records provider, uncertainty and the input references considered', () => {
    const candidates = buildFactCandidates(
      fingerprint,
      { text: 'Sony kamera', images: [{ dataUrl: 'data:image/jpeg;base64,AA==' }] },
      'gemini',
    );
    expect(candidates[0]).toMatchObject({ source: 'gemini', uncertainty: 'medium' });
    expect(candidates[0].references).toEqual([
      { kind: 'text', excerpt: 'Sony kamera' },
      { kind: 'image', index: 0 },
    ]);
  });

  it('keeps offline candidates conservative and reports explicit gaps', () => {
    const candidates = buildFactCandidates(
      fingerprint,
      { text: 'Sony kamera', images: [] },
      'offline',
    );
    expect(candidates.map((candidate) => candidate.key)).toEqual(['title', 'category', 'brand']);
    expect(candidates.every((candidate) => candidate.uncertainty === 'high')).toBe(true);
    expect(buildKnowledgeGaps(fingerprint).map((gap) => gap.key)).toEqual([
      'model',
      'conditionGrade',
      'attributes',
    ]);
  });
});
