import type {
  CoachAction,
  CoachActionKind,
  ComparableRecord,
  ItemProject,
  ListingTemplate,
  MarketplaceListingDraft,
  MarketplaceSite,
  PhotoAssessment,
  PriceDecision,
  ProjectOutcome,
  ProjectReadiness,
  ProjectReadinessIssue,
  ProjectReadinessSeverity,
  ProjectReadinessStage,
  ProjectReadinessStageId,
  ProjectSection,
  ProjectStatus,
  SellPlan,
  ValuationResult,
  VerifiedProductFacts,
} from '@core/types';
import { getCategoryProfile, isRequirementComplete } from './categoryProfileService';
import { listingReadinessService } from './listingReadinessService';
import { listingTemplateService } from './listingTemplateService';

export interface ProjectReadinessInput {
  facts: VerifiedProductFacts | null;
  photos: PhotoAssessment[];
  comparables: ComparableRecord[];
  valuation: ValuationResult | null;
  priceDecision: PriceDecision;
  listingDrafts: MarketplaceListingDraft[];
  legacyListings?: ListingTemplate[];
  selectedMarketplace?: MarketplaceSite | null;
  sellPlan?: SellPlan | null;
  projectStatus: ProjectStatus;
  outcome?: ProjectOutcome;
}

const ACTION_KEYS: Record<
  CoachActionKind,
  Pick<CoachAction, 'titleKey' | 'reasonKey' | 'impactKey'>
> = {
  safety: {
    titleKey: 'coachSafetyTitle',
    reasonKey: 'coachSafetyReason',
    impactKey: 'coachSafetyImpact',
  },
  facts: {
    titleKey: 'coachFactsTitle',
    reasonKey: 'coachFactsReason',
    impactKey: 'coachFactsImpact',
  },
  photos: {
    titleKey: 'coachPhotosTitle',
    reasonKey: 'coachPhotosReason',
    impactKey: 'coachPhotosImpact',
  },
  comparables: {
    titleKey: 'coachComparablesTitle',
    reasonKey: 'coachComparablesReason',
    impactKey: 'coachComparablesImpact',
  },
  price: {
    titleKey: 'coachPriceTitle',
    reasonKey: 'coachPriceReason',
    impactKey: 'coachPriceImpact',
  },
  listing: {
    titleKey: 'coachListingTitle',
    reasonKey: 'coachListingReason',
    impactKey: 'coachListingImpact',
  },
  'follow-up': {
    titleKey: 'coachFollow-upTitle',
    reasonKey: 'coachFollow-upReason',
    impactKey: 'coachFollow-upImpact',
  },
};

const SEVERITY_ORDER: Record<ProjectReadinessSeverity, number> = {
  blocker: 0,
  warning: 1,
  improvement: 2,
  'optional-research': 3,
};

const STAGE_SECTIONS: Record<ProjectReadinessStageId, ProjectSection> = {
  item: 'item',
  price: 'market',
  listing: 'listing',
  'follow-up': 'follow-up',
};

function issue(
  input: Omit<ProjectReadinessIssue, 'titleKey' | 'reasonKey' | 'impactKey'>,
): ProjectReadinessIssue {
  if (['price:decision-required', 'price:invalid-user-price'].includes(input.id)) {
    return {
      ...input,
      titleKey: 'coachPriceDecisionTitle',
      reasonKey: 'coachPriceDecisionReason',
      impactKey: 'coachPriceDecisionImpact',
    };
  }
  if (input.kind === 'facts' && input.severity !== 'blocker') {
    return {
      ...input,
      titleKey: 'coachFactsOptionalTitle',
      reasonKey: 'coachFactsOptionalReason',
      impactKey: 'coachFactsOptionalImpact',
    };
  }
  if (input.kind === 'listing' && input.id !== 'listing:draft-required') {
    return {
      ...input,
      titleKey: input.severity === 'blocker' ? 'coachListingFixTitle' : 'coachListingImproveTitle',
      reasonKey:
        input.severity === 'blocker' ? 'coachListingFixReason' : 'coachListingImproveReason',
      impactKey:
        input.severity === 'blocker' ? 'coachListingFixImpact' : 'coachListingImproveImpact',
    };
  }
  return { ...input, ...ACTION_KEYS[input.kind] };
}

function approvedRealizedCount(comparables: ComparableRecord[]): number {
  return comparables.filter(
    (comparable) =>
      comparable.priceKind === 'realized' &&
      comparable.decision?.included === true &&
      comparable.decision.decidedBy === 'user',
  ).length;
}

function itemIssues(
  facts: VerifiedProductFacts | null,
  photos: PhotoAssessment[],
): ProjectReadinessIssue[] {
  if (!facts) {
    return [
      issue({
        id: 'item:analysis-required',
        stage: 'item',
        severity: 'blocker',
        kind: 'facts',
        priority: 20,
        targetSection: 'item',
        targetId: 'item-analysis',
      }),
    ];
  }

  const profile = getCategoryProfile(facts.category.value);
  const factIssues = profile.facts.flatMap((requirement): ProjectReadinessIssue[] => {
    if (isRequirementComplete(facts, requirement.key)) return [];
    const safety = ['testedStatus', 'authenticityStatus'].includes(requirement.key);
    return [
      issue({
        id: `item:fact:${requirement.key}`,
        stage: 'item',
        severity: requirement.level === 'required' ? 'blocker' : 'improvement',
        kind: safety ? 'safety' : 'facts',
        priority: safety ? 10 : requirement.level === 'required' ? 20 : 25,
        targetSection: 'item',
        targetId: `fact-${requirement.key.replace('.', '-')}`,
        fieldId: requirement.key,
      }),
    ];
  });

  const photoIssues = profile.photos.flatMap((requirement): ProjectReadinessIssue[] => {
    if (photos.some((photo) => photo.role === requirement.role)) return [];
    return [
      issue({
        id: `item:photo:${requirement.role}`,
        stage: 'item',
        severity: 'improvement',
        kind: 'photos',
        priority: requirement.level === 'required' ? 30 : 31,
        targetSection: 'item',
        targetId: 'photo-checklist',
        fieldId: requirement.role,
      }),
    ];
  });

  if (photos.some((photo) => photo.issues.length > 0)) {
    photoIssues.push(
      issue({
        id: 'item:photo:quality',
        stage: 'item',
        severity: 'improvement',
        kind: 'photos',
        priority: 32,
        targetSection: 'item',
        targetId: 'photo-checklist',
      }),
    );
  }

  return [...factIssues, ...photoIssues];
}

function priceIssues(
  priceDecision: PriceDecision,
  comparables: ComparableRecord[],
  valuation: ValuationResult | null,
): ProjectReadinessIssue[] {
  const approvedCount = approvedRealizedCount(comparables);
  const issues: ProjectReadinessIssue[] = [];

  if (priceDecision.kind === 'unset') {
    issues.push(
      issue({
        id: 'price:decision-required',
        stage: 'price',
        severity: 'blocker',
        kind: 'price',
        priority: 50,
        targetSection: 'market',
        targetId: 'price-decision',
      }),
    );
  } else if (priceDecision.kind === 'user_entered') {
    if (!Number.isFinite(priceDecision.amountSek) || priceDecision.amountSek <= 0) {
      issues.push(
        issue({
          id: 'price:invalid-user-price',
          stage: 'price',
          severity: 'blocker',
          kind: 'price',
          priority: 50,
          targetSection: 'market',
          targetId: 'price-decision',
        }),
      );
    }
    if (approvedCount < 2) {
      issues.push(
        issue({
          id: 'price:optional-comparables',
          stage: 'price',
          severity: 'optional-research',
          kind: 'comparables',
          priority: 80,
          targetSection: 'market',
          targetId: 'comparables',
        }),
      );
    }
    if (!valuation || valuation.status === 'insufficient-evidence') {
      issues.push(
        issue({
          id: 'price:optional-valuation',
          stage: 'price',
          severity: 'optional-research',
          kind: 'price',
          priority: 81,
          targetSection: 'market',
          targetId: 'valuation',
        }),
      );
    }
  } else {
    if (approvedCount < 2) {
      issues.push(
        issue({
          id: 'price:evidence-required',
          stage: 'price',
          severity: 'blocker',
          kind: 'comparables',
          priority: 40,
          targetSection: 'market',
          targetId: 'comparables',
        }),
      );
    }
    if (!valuation || valuation.status === 'insufficient-evidence') {
      issues.push(
        issue({
          id: 'price:valuation-required',
          stage: 'price',
          severity: 'blocker',
          kind: 'price',
          priority: 50,
          targetSection: 'market',
          targetId: 'valuation',
        }),
      );
    }
  }

  return issues;
}

function listingDraftsFromInput(input: ProjectReadinessInput): MarketplaceListingDraft[] {
  if (input.listingDrafts.length > 0) return input.listingDrafts;
  return (input.legacyListings ?? []).map((template) =>
    listingTemplateService.draftFromLegacyTemplate(template),
  );
}

function listingIssues(
  draft: MarketplaceListingDraft | undefined,
  site: MarketplaceSite | null,
): ProjectReadinessIssue[] {
  if (!draft || !site) {
    return [
      issue({
        id: 'listing:draft-required',
        stage: 'listing',
        severity: 'blocker',
        kind: 'listing',
        priority: 60,
        targetSection: 'listing',
        targetId: 'listing-studio',
      }),
    ];
  }

  return listingReadinessService.assess(draft).map((readinessIssue) =>
    issue({
      id: `listing:${site}:${readinessIssue.id}`,
      stage: 'listing',
      severity: readinessIssue.severity,
      kind: 'listing',
      priority: readinessIssue.severity === 'blocker' ? 60 : 65,
      targetSection: 'listing',
      targetId: `listing-${site}-${readinessIssue.field}`,
      fieldId: readinessIssue.field,
    }),
  );
}

function stage(
  id: ProjectReadinessStageId,
  issues: ProjectReadinessIssue[],
  stateOverride?: ProjectReadinessStage['state'],
): ProjectReadinessStage {
  const stageIssues = issues.filter((candidate) => candidate.stage === id);
  const blockerCount = stageIssues.filter((candidate) => candidate.severity === 'blocker').length;
  const ready = blockerCount === 0;
  return {
    id,
    state: stateOverride ?? (ready ? 'ready' : 'blocked'),
    ready,
    blockerCount,
    issueIds: stageIssues.map((candidate) => candidate.id),
    targetSection: STAGE_SECTIONS[id],
  };
}

function actionFromIssue(readinessIssue: ProjectReadinessIssue): CoachAction {
  return {
    id: readinessIssue.id,
    kind: readinessIssue.kind,
    priority: readinessIssue.priority,
    severity: readinessIssue.severity,
    titleKey: readinessIssue.titleKey,
    reasonKey: readinessIssue.reasonKey,
    impactKey: readinessIssue.impactKey,
    targetSection: readinessIssue.targetSection,
    targetId: readinessIssue.targetId,
  };
}

export function evaluateProjectReadiness(input: ProjectReadinessInput): ProjectReadiness {
  const drafts = listingDraftsFromInput(input);
  const selectedMarketplace =
    input.selectedMarketplace ??
    input.sellPlan?.marketplace ??
    drafts[0]?.site ??
    input.legacyListings?.[0]?.site ??
    null;
  const selectedDraft = drafts.find((draft) => draft.site === selectedMarketplace);
  const issues = [
    ...itemIssues(input.facts, input.photos),
    ...priceIssues(input.priceDecision, input.comparables, input.valuation),
    ...listingIssues(selectedDraft, selectedMarketplace),
  ];

  const followUpPending =
    input.projectStatus === 'listed' && (!input.outcome || input.outcome.saleStatus === 'pending');
  if (followUpPending) {
    issues.push(
      issue({
        id: 'follow-up:record-outcome',
        stage: 'follow-up',
        severity: 'improvement',
        kind: 'follow-up',
        priority: 70,
        targetSection: 'follow-up',
        targetId: 'follow-up',
      }),
    );
  }

  const sortedIssues = [...issues].sort(
    (left, right) =>
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
      left.priority - right.priority ||
      left.id.localeCompare(right.id),
  );
  const blockerCount = sortedIssues.filter((candidate) => candidate.severity === 'blocker').length;
  const stages = {
    item: stage('item', sortedIssues),
    price: stage('price', sortedIssues),
    listing: stage('listing', sortedIssues),
    'follow-up': stage(
      'follow-up',
      sortedIssues,
      followUpPending
        ? 'pending'
        : input.projectStatus === 'listed' ||
            input.projectStatus === 'sold' ||
            input.projectStatus === 'paused'
          ? 'ready'
          : 'optional',
    ),
  };
  const copyEligible = blockerCount === 0;

  return {
    stages,
    issues: sortedIssues,
    blockerCount,
    nextAction: sortedIssues[0] ? actionFromIssue(sortedIssues[0]) : null,
    selectedMarketplace,
    copyEligible,
    complete: stages.item.ready && stages.price.ready && stages.listing.ready,
  };
}

export function evaluateProjectRecordReadiness(project: ItemProject): ProjectReadiness {
  return evaluateProjectReadiness({
    facts: project.workspace.productFacts ?? null,
    photos: project.workspace.photoAssessments ?? [],
    comparables: [...project.workspace.traderaComps, ...project.workspace.manualComps],
    valuation: project.workspace.valuation,
    priceDecision: project.priceDecision,
    listingDrafts: project.workspace.listingDrafts ?? [],
    legacyListings: project.workspace.templates,
    selectedMarketplace: project.workspace.selectedMarketplace,
    sellPlan: project.workspace.sellPlan,
    projectStatus: project.status,
    outcome: project.outcome,
  });
}

export const projectReadinessService = {
  evaluate: evaluateProjectReadiness,
  evaluateProject: evaluateProjectRecordReadiness,
};
