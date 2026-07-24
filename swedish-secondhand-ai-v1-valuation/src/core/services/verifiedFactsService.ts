import type {
  ConditionGrade,
  ItemFingerprint,
  ProductFactKey,
  ProductListFactKey,
  VerifiedFact,
  VerifiedProductFacts,
} from '@core/types';

function aiFact<T>(value: T, confidence: number): VerifiedFact<T> {
  return {
    value,
    source: 'ai',
    locked: false,
    evidence: `AI analysis confidence ${Math.round(confidence * 100)}%`,
  };
}

export function factsFromFingerprint(fingerprint: ItemFingerprint): VerifiedProductFacts {
  return {
    schemaVersion: 1,
    title: aiFact(fingerprint.title, fingerprint.confidence),
    category: aiFact(fingerprint.category, fingerprint.confidence),
    brand: aiFact(fingerprint.brand, fingerprint.confidence),
    model: aiFact(fingerprint.model, fingerprint.confidence),
    conditionGrade: aiFact(fingerprint.conditionGrade, fingerprint.confidence),
    defects: aiFact([], fingerprint.confidence),
    includedAccessories: aiFact([], fingerprint.confidence),
    missingAccessories: aiFact([], fingerprint.confidence),
    testedStatus: aiFact<'unknown'>('unknown', fingerprint.confidence),
    attributes: Object.fromEntries(
      Object.entries(fingerprint.attributes).map(([key, value]) => [
        key,
        aiFact(value, fingerprint.confidence),
      ]),
    ),
  };
}

export function mergeAnalyzedFacts(
  current: VerifiedProductFacts | null,
  fingerprint: ItemFingerprint,
): VerifiedProductFacts {
  const analyzed = factsFromFingerprint(fingerprint);
  if (!current) return analyzed;

  const preserveLocked = <T>(existing: VerifiedFact<T>, incoming: VerifiedFact<T>) =>
    existing.locked ? existing : incoming;

  const attributes = { ...analyzed.attributes };
  Object.entries(current.attributes).forEach(([key, fact]) => {
    if (fact.locked) attributes[key] = fact;
  });

  return {
    ...analyzed,
    title: preserveLocked(current.title, analyzed.title),
    category: preserveLocked(current.category, analyzed.category),
    brand: preserveLocked(current.brand, analyzed.brand),
    model: preserveLocked(current.model, analyzed.model),
    conditionGrade: preserveLocked(current.conditionGrade, analyzed.conditionGrade),
    defects: preserveLocked(current.defects, analyzed.defects),
    includedAccessories: preserveLocked(current.includedAccessories, analyzed.includedAccessories),
    missingAccessories: preserveLocked(current.missingAccessories, analyzed.missingAccessories),
    testedStatus: preserveLocked(current.testedStatus, analyzed.testedStatus),
    attributes,
  };
}

export function updateProductFact(
  facts: VerifiedProductFacts,
  key: ProductFactKey,
  value: string,
  locked = true,
): VerifiedProductFacts {
  const normalized = value.trim();
  if (!normalized) return facts;
  if (key === 'conditionGrade') {
    const allowed = new Set<ConditionGrade>(['new', 'like_new', 'good', 'fair', 'poor', 'unknown']);
    if (!allowed.has(normalized as ConditionGrade)) return facts;
    return {
      ...facts,
      conditionGrade: {
        value: normalized as ConditionGrade,
        source: 'user',
        locked,
        evidence: 'Confirmed by user',
      },
    };
  }
  return {
    ...facts,
    [key]: {
      value: normalized,
      source: 'user',
      locked,
      evidence: 'Confirmed by user',
    },
  };
}

export function setProductFactLock(
  facts: VerifiedProductFacts,
  key: ProductFactKey,
  locked: boolean,
): VerifiedProductFacts {
  return { ...facts, [key]: { ...facts[key], locked } };
}

export function fingerprintFromFacts(
  facts: VerifiedProductFacts,
  fallback: ItemFingerprint,
): ItemFingerprint {
  return {
    ...fallback,
    title: facts.title.value,
    category: facts.category.value,
    brand: facts.brand.value,
    model: facts.model.value,
    conditionGrade: facts.conditionGrade.value,
    attributes: Object.fromEntries(
      Object.entries(facts.attributes).map(([key, fact]) => [key, fact.value]),
    ),
  };
}

export function updateProductListFact(
  facts: VerifiedProductFacts,
  key: ProductListFactKey,
  value: string,
): VerifiedProductFacts {
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return {
    ...facts,
    [key]: {
      value: entries,
      source: 'user',
      locked: true,
      evidence: 'Confirmed by user',
    },
  };
}

export function updateTestedStatus(
  facts: VerifiedProductFacts,
  value: VerifiedProductFacts['testedStatus']['value'],
): VerifiedProductFacts {
  return {
    ...facts,
    testedStatus: {
      value,
      source: 'user',
      locked: true,
      evidence: 'Confirmed by user',
    },
  };
}
