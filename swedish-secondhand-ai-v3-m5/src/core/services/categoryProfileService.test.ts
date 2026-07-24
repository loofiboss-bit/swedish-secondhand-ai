import { describe, expect, it } from 'vitest';
import type { ItemFingerprint } from '@core/types';
import { factsFromFingerprint, updateTestedStatus } from './verifiedFactsService';
import {
  getCategoryProfile,
  isRequirementComplete,
  normalizeSellerCategory,
} from './categoryProfileService';

const fingerprint: ItemFingerprint = {
  title: 'Sony kamera',
  category: 'Electronics',
  brand: 'Sony',
  model: 'A6400',
  conditionGrade: 'good',
  attributes: {},
  detectedLanguage: 'sv',
  confidence: 0.8,
};

describe('categoryProfileService', () => {
  it.each([
    ['Elektronik', 'Electronics'],
    ['mode', 'Fashion'],
    ['Möbler', 'Furniture'],
    ['samlarobjekt', 'Collectibles'],
    ['något annat', 'General'],
  ] as const)('normalizes %s to %s', (input, expected) => {
    expect(normalizeSellerCategory(input)).toBe(expected);
  });

  it('defines required and recommended facts and photos for every profile', () => {
    for (const category of ['Electronics', 'Fashion', 'Furniture', 'Collectibles', 'General']) {
      const profile = getCategoryProfile(category);
      expect(profile.facts.some((fact) => fact.level === 'required')).toBe(true);
      expect(profile.photos.some((photo) => photo.role === 'cover')).toBe(true);
    }
  });

  it('treats unknown status as missing until the user verifies it', () => {
    const facts = factsFromFingerprint(fingerprint);
    expect(isRequirementComplete(facts, 'testedStatus')).toBe(false);
    expect(isRequirementComplete(updateTestedStatus(facts, 'tested'), 'testedStatus')).toBe(true);
  });
});
