import { describe, expect, it } from 'vitest';
import type { ItemFingerprint } from '@core/types';
import {
  factsFromFingerprint,
  mergeAnalyzedFacts,
  updateProductFact,
} from './verifiedFactsService';

const fingerprint: ItemFingerprint = {
  title: 'Sony camera',
  category: 'Electronics',
  brand: 'Sony',
  model: 'A6000',
  conditionGrade: 'good',
  attributes: {},
  detectedLanguage: 'en',
  confidence: 0.8,
};

describe('verifiedFactsService', () => {
  it('never overwrites a locked user correction during reanalysis', () => {
    const current = updateProductFact(factsFromFingerprint(fingerprint), 'model', 'A6400');
    const next = mergeAnalyzedFacts(current, { ...fingerprint, model: 'A6100', brand: 'SONY' });

    expect(next.model).toMatchObject({ value: 'A6400', source: 'user', locked: true });
    expect(next.brand).toMatchObject({ value: 'SONY', source: 'ai', locked: false });
  });

  it('replaces unlocked AI values on a new analysis', () => {
    const next = mergeAnalyzedFacts(factsFromFingerprint(fingerprint), {
      ...fingerprint,
      title: 'Sony A6000 camera body',
    });

    expect(next.title.value).toBe('Sony A6000 camera body');
  });

  it('rejects an invalid condition correction', () => {
    const current = factsFromFingerprint(fingerprint);

    expect(updateProductFact(current, 'conditionGrade', 'perfect')).toBe(current);
  });
});
