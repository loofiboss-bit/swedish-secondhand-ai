import type { FollowUpAction, ProjectOutcome } from '@core/types';

export function buildFollowUpActions(outcome: ProjectOutcome | undefined): FollowUpAction[] {
  if (!outcome?.listedAt || outcome.saleStatus !== 'pending') return [];
  return [
    {
      id: 'follow-up-photos',
      kind: 'photos',
      titleKey: 'followUpPhotosTitle',
      reasonKey: 'followUpPhotosReason',
      basis: 'general-rule',
    },
    {
      id: 'follow-up-price',
      kind: 'price',
      titleKey: 'followUpPriceTitle',
      reasonKey: 'followUpPriceReason',
      basis: 'general-rule',
    },
    {
      id: 'follow-up-description',
      kind: 'description',
      titleKey: 'followUpDescriptionTitle',
      reasonKey: 'followUpDescriptionReason',
      basis: 'general-rule',
    },
  ];
}

export const followUpService = { buildActions: buildFollowUpActions };
