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

  it('bounds provider-derived candidates to the persisted project contract', () => {
    const attributes = Object.fromEntries(
      Array.from({ length: 150 }, (_, index) => [`attribute-${index}`, 'x'.repeat(3_000)]),
    );
    const candidates = buildFactCandidates(
      { ...fingerprint, attributes },
      { text: '', images: [] },
      'ollama',
    );

    expect(candidates.length).toBeLessThanOrEqual(100);
    expect(candidates.length).toBeGreaterThan(50);
    expect(candidates.every((candidate) => candidate.id.length <= 300)).toBe(true);
    expect(candidates.every((candidate) => candidate.key.length <= 100)).toBe(true);
    expect(candidates.every((candidate) => candidate.value.length <= 2_000)).toBe(true);
  });
});
