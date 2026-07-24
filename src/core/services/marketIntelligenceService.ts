import type {
  AskingPriceRange,
  ComparableQueryPlan,
  ComparableQueryVariant,
  ComparableRecord,
  PricingStrategy,
  ValuationScenario,
  VerifiedProductFacts,
} from '@core/types';
import { valuationService } from './valuationService';
import { normalizeSellerCategory } from './categoryProfileService';

const STRATEGIES: PricingStrategy[] = ['fast_sale', 'balanced', 'max_value'];

function known(value: string): string | null {
  const normalized = value.trim();
  return normalized && !['unknown', 'unspecified item'].includes(normalized.toLowerCase())
    ? normalized
    : null;
}

function query(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function buildComparableQueryPlan(
  facts: VerifiedProductFacts,
  current?: ComparableQueryPlan | null,
  now = new Date().toISOString(),
): ComparableQueryPlan {
  const brand = known(facts.brand.value);
  const model = known(facts.model.value);
  const category = normalizeSellerCategory(facts.category.value);
  const title = known(facts.title.value);
  const attributes = Object.values(facts.attributes)
    .filter((fact) => fact.locked || fact.source === 'user')
    .map((fact) => known(fact.value))
    .filter((value): value is string => value !== null)
    .slice(0, 2);
  const proposed: ComparableQueryVariant[] = [
    {
      id: 'exact-primary',
      type: 'exact',
      query: query([brand, model, ...attributes]) || title || category || '',
      enabled: true,
      userEdited: false,
    },
    {
      id: 'broad-model',
      type: 'broad',
      query: query([brand, model]) || title || '',
      enabled: true,
      userEdited: false,
    },
    {
      id: 'broad-category',
      type: 'broad',
      query: query([brand, category]) || category || title || '',
      enabled: true,
      userEdited: false,
    },
  ];
  const seen = new Set<string>();
  const variants = proposed.flatMap((variant) => {
    const existing = current?.variants.find((candidate) => candidate.id === variant.id);
    const next = existing?.userEdited ? existing : variant;
    const normalized = next.query.toLocaleLowerCase('sv-SE');
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [next];
  });
  return { version: 1, generatedAt: now, variants };
}

export function updateComparableQueryVariant(
  plan: ComparableQueryPlan,
  id: string,
  patch: Partial<Pick<ComparableQueryVariant, 'query' | 'enabled'>>,
): ComparableQueryPlan {
  return {
    ...plan,
    variants: plan.variants.map((variant) =>
      variant.id === id
        ? {
            ...variant,
            ...patch,
            query: patch.query === undefined ? variant.query : patch.query.slice(0, 160),
            userEdited: true,
          }
        : variant,
    ),
  };
}

function observationKey(observation: ComparableRecord): string {
  const stableSourceId = observation.id.trim();
  if (stableSourceId) return `${observation.source}:id:${stableSourceId}`;
  if (observation.url.trim()) return `${observation.source}:url:${observation.url.trim()}`;
  return [
    observation.source,
    observation.title.toLocaleLowerCase('sv-SE').replaceAll(/\s+/g, ' ').trim(),
    Math.round(observation.priceSek),
    observation.soldAt.slice(0, 10),
  ].join(':');
}

export function normalizeAndDedupeObservations(
  observations: ComparableRecord[],
): ComparableRecord[] {
  const deduped = new Map<string, ComparableRecord>();
  for (const observation of observations) {
    const key = observationKey(observation);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, observation);
      continue;
    }
    const queryVariantIds = [
      ...new Set([...(existing.queryVariantIds ?? []), ...(observation.queryVariantIds ?? [])]),
    ];
    deduped.set(key, {
      ...existing,
      queryVariantIds,
      hitType:
        existing.hitType === 'exact' || observation.hitType === 'exact'
          ? 'exact'
          : (existing.hitType ?? observation.hitType),
      cacheAgeMs: Math.min(
        existing.cacheAgeMs ?? Number.POSITIVE_INFINITY,
        observation.cacheAgeMs ?? Number.POSITIVE_INFINITY,
      ),
      similarityScore: Math.max(existing.similarityScore, observation.similarityScore),
      sourceQuality: Math.max(existing.sourceQuality, observation.sourceQuality),
    });
  }
  return [...deduped.values()]
    .map((observation) => ({
      ...observation,
      cacheAgeMs: Number.isFinite(observation.cacheAgeMs) ? observation.cacheAgeMs : undefined,
    }))
    .sort((left, right) => {
      if (left.hitType !== right.hitType) return left.hitType === 'exact' ? -1 : 1;
      return right.similarityScore - left.similarityScore || left.id.localeCompare(right.id);
    });
}

export function askingPriceRange(observations: ComparableRecord[]): AskingPriceRange | null {
  const prices = observations
    .filter(
      (observation) =>
        observation.priceKind === 'asking' &&
        Number.isFinite(observation.priceSek) &&
        observation.priceSek > 0,
    )
    .map((observation) => observation.priceSek)
    .sort((left, right) => left - right);
  if (prices.length === 0) return null;
  const middle = Math.floor(prices.length / 2);
  const medianSek =
    prices.length % 2 === 0
      ? Math.round((prices[middle - 1] + prices[middle]) / 2)
      : prices[middle];
  return {
    count: prices.length,
    minSek: prices[0],
    medianSek,
    maxSek: prices.at(-1)!,
  };
}

export async function buildValuationScenarios(
  facts: VerifiedProductFacts,
  comparables: ComparableRecord[],
): Promise<ValuationScenario[]> {
  return Promise.all(
    STRATEGIES.map(async (strategy) => ({
      strategy,
      result: await valuationService.estimateValue(facts, comparables, strategy),
    })),
  );
}

export const marketIntelligenceService = {
  buildQueryPlan: buildComparableQueryPlan,
  updateQueryVariant: updateComparableQueryVariant,
  normalizeAndDedupe: normalizeAndDedupeObservations,
  askingPriceRange,
  buildScenarios: buildValuationScenarios,
};
