import type {
  CoachAction,
  ComparableRecord,
  EvidenceGap,
  ListingTemplate,
  MarketplaceListingDraft,
  MarketplaceSite,
  PhotoAssessment,
  PriceDecision,
  ProjectOutcome,
  ProjectReadiness,
  ProjectStatus,
  SellPlan,
  ValuationResult,
  VerifiedProductFacts,
} from '@core/types';
import { evaluateProjectReadiness } from './projectReadinessService';

export interface CoachContext {
  facts: VerifiedProductFacts | null;
  photos: PhotoAssessment[];
  comparables: ComparableRecord[];
  valuation: ValuationResult | null;
  listings: ListingTemplate[];
  listingDrafts?: MarketplaceListingDraft[];
  priceDecision?: PriceDecision;
  selectedMarketplace?: MarketplaceSite | null;
  sellPlan?: SellPlan | null;
  projectStatus: ProjectStatus;
  outcome?: ProjectOutcome;
}

export interface CoachResult {
  gaps: EvidenceGap[];
  actions: CoachAction[];
  readiness: ProjectReadiness;
}

export function evaluateCoach(context: CoachContext): CoachResult {
  const readiness = evaluateProjectReadiness({
    facts: context.facts,
    photos: context.photos,
    comparables: context.comparables,
    valuation: context.valuation,
    priceDecision: context.priceDecision ?? { kind: 'unset' },
    listingDrafts: context.listingDrafts ?? [],
    legacyListings: context.listings,
    selectedMarketplace: context.selectedMarketplace,
    sellPlan: context.sellPlan,
    projectStatus: context.projectStatus,
    outcome: context.outcome,
  });
  const actions = readiness.issues.map(
    (readinessIssue): CoachAction => ({
      id: readinessIssue.id,
      kind: readinessIssue.kind,
      priority: readinessIssue.priority,
      severity: readinessIssue.severity,
      titleKey: readinessIssue.titleKey,
      reasonKey: readinessIssue.reasonKey,
      impactKey: readinessIssue.impactKey,
      targetSection: readinessIssue.targetSection,
      targetId: readinessIssue.targetId,
    }),
  );
  const gaps = readiness.issues
    .filter((readinessIssue) => readinessIssue.stage === 'item')
    .map(
      (readinessIssue): EvidenceGap => ({
        id: readinessIssue.id,
        key: readinessIssue.fieldId ?? readinessIssue.id,
        severity: readinessIssue.severity === 'blocker' ? 'blocking' : 'recommended',
        reason: readinessIssue.reasonKey,
        targetSection: readinessIssue.targetSection,
        targetId: readinessIssue.targetId,
      }),
    );

  return { gaps, actions, readiness };
}

export const coachEngine = { evaluate: evaluateCoach };
