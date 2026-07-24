import type {
  CoachAction,
  ComparableRecord,
  EvidenceGap,
  ListingTemplate,
  PhotoAssessment,
  ProjectStatus,
  ValuationResult,
  VerifiedProductFacts,
} from '@core/types';
import { getCategoryProfile, isRequirementComplete } from './categoryProfileService';

export interface CoachContext {
  facts: VerifiedProductFacts | null;
  photos: PhotoAssessment[];
  comparables: ComparableRecord[];
  valuation: ValuationResult | null;
  listings: ListingTemplate[];
  projectStatus: ProjectStatus;
}

export interface CoachResult {
  gaps: EvidenceGap[];
  actions: CoachAction[];
}

function action(
  id: string,
  kind: CoachAction['kind'],
  priority: number,
  severity: CoachAction['severity'],
  targetSection: CoachAction['targetSection'],
  targetId?: string,
): CoachAction {
  const key = kind === 'comparables' ? 'Comparables' : `${kind[0].toUpperCase()}${kind.slice(1)}`;
  return {
    id,
    kind,
    priority,
    severity,
    titleKey: `coach${key}Title`,
    reasonKey: `coach${key}Reason`,
    impactKey: `coach${key}Impact`,
    targetSection,
    targetId,
  };
}

function factGaps(facts: VerifiedProductFacts | null): EvidenceGap[] {
  if (!facts) {
    return [
      {
        id: 'facts:not-analyzed',
        key: 'analysis',
        severity: 'blocking',
        reason: 'Item facts have not been analyzed and reviewed.',
        targetSection: 'item',
        targetId: 'item-analysis',
      },
    ];
  }
  return getCategoryProfile(facts.category.value).facts.flatMap((requirement) => {
    if (isRequirementComplete(facts, requirement.key)) return [];
    return [
      {
        id: `fact:${requirement.key}`,
        key: requirement.key,
        severity: requirement.level === 'required' ? 'blocking' : 'recommended',
        reason: `${requirement.label} is missing.`,
        targetSection: 'item' as const,
        targetId: `fact-${requirement.key.replace('.', '-')}`,
      },
    ];
  });
}

function photoGaps(facts: VerifiedProductFacts | null, photos: PhotoAssessment[]): EvidenceGap[] {
  const profile = getCategoryProfile(facts?.category.value);
  const gaps: EvidenceGap[] = profile.photos.flatMap((requirement): EvidenceGap[] => {
    if (photos.some((photo) => photo.role === requirement.role)) return [];
    return [
      {
        id: `photo:${requirement.role}`,
        key: requirement.role,
        severity: requirement.level === 'required' ? 'blocking' : 'recommended',
        reason: `${requirement.label} is missing.`,
        targetSection: 'item' as const,
        targetId: 'photo-checklist',
      },
    ];
  });
  if (photos.some((photo) => photo.issues.length > 0)) {
    gaps.push({
      id: 'photo:quality',
      key: 'quality',
      severity: 'recommended',
      reason: 'One or more photos have measurable quality issues.',
      targetSection: 'item',
      targetId: 'photo-checklist',
    });
  }
  return gaps;
}

function approvedRealizedCount(comparables: ComparableRecord[]): number {
  return comparables.filter(
    (comparable) =>
      comparable.priceKind === 'realized' &&
      comparable.decision?.included === true &&
      comparable.decision.decidedBy === 'user',
  ).length;
}

export function evaluateCoach(context: CoachContext): CoachResult {
  const gaps = [...factGaps(context.facts), ...photoGaps(context.facts, context.photos)];
  const actions: CoachAction[] = [];
  const safetyGap = gaps.find((gap) => ['testedStatus', 'authenticityStatus'].includes(gap.key));
  const ordinaryFactGap = gaps.find(
    (gap) => gap.id.startsWith('fact:') && gap.severity === 'blocking' && gap !== safetyGap,
  );
  const photoGap = gaps.find((gap) => gap.id.startsWith('photo:'));

  if (safetyGap)
    actions.push(action('safety', 'safety', 10, 'blocking', 'item', safetyGap.targetId));
  if (ordinaryFactGap || (!context.facts && gaps.length > 0)) {
    actions.push(
      action(
        'facts',
        'facts',
        20,
        'blocking',
        'item',
        ordinaryFactGap?.targetId ?? 'item-analysis',
      ),
    );
  }
  if (photoGap) {
    actions.push(
      action(
        'photos',
        'photos',
        30,
        photoGap.severity === 'blocking' ? 'blocking' : 'improvement',
        'item',
        'photo-checklist',
      ),
    );
  }
  if (approvedRealizedCount(context.comparables) < 2) {
    actions.push(action('comparables', 'comparables', 40, 'blocking', 'market', 'comparables'));
  }
  if (!context.valuation || context.valuation.status === 'insufficient-evidence') {
    actions.push(action('price', 'price', 50, 'blocking', 'market', 'valuation'));
  }
  if (context.listings.length === 0) {
    actions.push(action('listing', 'listing', 60, 'improvement', 'listing', 'listing-studio'));
  }
  if (context.projectStatus === 'listed') {
    actions.push(action('follow-up', 'follow-up', 70, 'improvement', 'follow-up'));
  }

  return { gaps, actions: actions.sort((left, right) => left.priority - right.priority) };
}

export const coachEngine = { evaluate: evaluateCoach };
