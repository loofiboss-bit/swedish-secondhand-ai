import type { ItemProject, ProjectProgress, ProjectProgressStep } from '@core/types';

function hasReviewedItem(project: ItemProject): boolean {
  const facts = project.workspace.productFacts;
  return Boolean(
    facts &&
    facts.title.value.trim() &&
    facts.category.value.trim() &&
    facts.conditionGrade.value !== 'unknown',
  );
}

export function calculateProjectProgress(project: ItemProject): ProjectProgress {
  const itemReady = hasReviewedItem(project);
  const priceReady = project.priceDecision.kind !== 'unset';
  const listingReady =
    (project.workspace.listingDrafts?.length ?? 0) > 0 || project.workspace.templates.length > 0;
  const complete = itemReady && priceReady && listingReady;
  const completedSteps: ProjectProgressStep[] = [];
  if (itemReady) completedSteps.push('item');
  if (priceReady) completedSteps.push('price');
  if (listingReady) completedSteps.push('listing');
  if (complete) completedSteps.push('complete');
  const currentStep: ProjectProgressStep = !itemReady
    ? 'item'
    : !priceReady
      ? 'price'
      : !listingReady
        ? 'listing'
        : 'complete';
  return { currentStep, completedSteps, itemReady, priceReady, listingReady, complete };
}

export const projectProgressService = { calculate: calculateProjectProgress };
