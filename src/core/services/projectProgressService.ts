import type { ItemProject, ProjectProgress, ProjectProgressStep } from '@core/types';
import { evaluateProjectRecordReadiness } from './projectReadinessService';

export function calculateProjectProgress(project: ItemProject): ProjectProgress {
  const readiness = evaluateProjectRecordReadiness(project);
  const itemReady = readiness.stages.item.ready;
  const priceReady = readiness.stages.price.ready;
  const listingReady = readiness.stages.listing.ready;
  const complete = readiness.complete;
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
