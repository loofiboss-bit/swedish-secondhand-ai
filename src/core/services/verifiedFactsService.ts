import type {
  ConditionGrade,
  ItemFingerprint,
  LockableProductFactKey,
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

function isFact(value: unknown): value is VerifiedFact<unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const fact = value as Partial<VerifiedFact<unknown>>;
  return (
    'value' in fact &&
    ['ai', 'user', 'heuristic'].includes(String(fact.source)) &&
    typeof fact.locked === 'boolean' &&
    (fact.evidence === undefined ||
      (typeof fact.evidence === 'string' && fact.evidence.length <= 2_000))
  );
}

function isStringFact(value: unknown, maxLength = 2_000): value is VerifiedFact<string> {
  return isFact(value) && typeof value.value === 'string' && value.value.length <= maxLength;
}

function isStringListFact(value: unknown): value is VerifiedFact<string[]> {
  return (
    isFact(value) &&
    Array.isArray(value.value) &&
    value.value.length <= 100 &&
    value.value.every((entry) => typeof entry === 'string' && entry.length <= 500)
  );
}

export function isVerifiedProductFacts(value: unknown): value is VerifiedProductFacts {
  if (typeof value !== 'object' || value === null) return false;
  const facts = value as Partial<VerifiedProductFacts>;
  return (
    facts.schemaVersion === 2 &&
    isStringFact(facts.title) &&
    isStringFact(facts.category) &&
    isStringFact(facts.brand) &&
    isStringFact(facts.model) &&
    isFact(facts.conditionGrade) &&
    ['new', 'like_new', 'good', 'fair', 'poor', 'unknown'].includes(
      String(facts.conditionGrade.value),
    ) &&
    isStringListFact(facts.defects) &&
    isStringListFact(facts.includedAccessories) &&
    isStringListFact(facts.missingAccessories) &&
    isFact(facts.testedStatus) &&
    ['tested', 'untested', 'unknown'].includes(String(facts.testedStatus.value)) &&
    isFact(facts.authenticityStatus) &&
    ['verified', 'unverified', 'unknown'].includes(String(facts.authenticityStatus.value)) &&
    typeof facts.attributes === 'object' &&
    facts.attributes !== null &&
    !Array.isArray(facts.attributes) &&
    Object.entries(facts.attributes).length <= 100 &&
    Object.entries(facts.attributes).every(
      ([key, fact]) => key.length > 0 && key.length <= 100 && isStringFact(fact),
    )
  );
}

export function factsFromFingerprint(fingerprint: ItemFingerprint): VerifiedProductFacts {
  return {
    schemaVersion: 2,
    title: aiFact(fingerprint.title, fingerprint.confidence),
    category: aiFact(fingerprint.category, fingerprint.confidence),
    brand: aiFact(fingerprint.brand, fingerprint.confidence),
    model: aiFact(fingerprint.model, fingerprint.confidence),
    conditionGrade: aiFact(fingerprint.conditionGrade, fingerprint.confidence),
    defects: aiFact([], fingerprint.confidence),
    includedAccessories: aiFact([], fingerprint.confidence),
    missingAccessories: aiFact([], fingerprint.confidence),
    testedStatus: aiFact<'unknown'>('unknown', fingerprint.confidence),
    authenticityStatus: {
      value: 'unknown',
      source: 'heuristic',
      locked: false,
      evidence: 'Authenticity has not been verified',
    },
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
    authenticityStatus: preserveLocked(current.authenticityStatus, analyzed.authenticityStatus),
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
  key: LockableProductFactKey,
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

export function updateProductAttribute(
  facts: VerifiedProductFacts,
  key: string,
  value: string,
): VerifiedProductFacts {
  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  if (!normalizedKey || !normalizedValue) return facts;
  return {
    ...facts,
    attributes: {
      ...facts.attributes,
      [normalizedKey]: {
        value: normalizedValue,
        source: 'user',
        locked: true,
        evidence: 'Confirmed by user',
      },
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

export function updateAuthenticityStatus(
  facts: VerifiedProductFacts,
  value: VerifiedProductFacts['authenticityStatus']['value'],
): VerifiedProductFacts {
  return {
    ...facts,
    authenticityStatus: {
      value,
      source: 'user',
      locked: true,
      evidence: 'Confirmed by user',
    },
  };
}

export function upgradeProductFacts(
  value: unknown,
  fingerprint: ItemFingerprint,
): VerifiedProductFacts {
  const fallback = factsFromFingerprint(fingerprint);
  if (typeof value !== 'object' || value === null) return fallback;
  const legacy = value as Partial<VerifiedProductFacts>;
  return {
    ...fallback,
    ...legacy,
    schemaVersion: 2,
    authenticityStatus: legacy.authenticityStatus ?? fallback.authenticityStatus,
  };
}
