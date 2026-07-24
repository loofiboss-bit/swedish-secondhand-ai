import type { FollowUpAction, ProjectOutcome } from '@core/types';

const DAY_MS = 86_400_000;

export function listingAgeDays(
  outcome: ProjectOutcome | undefined,
  now = new Date(),
): number | null {
  if (!outcome?.listedAt) return null;
  const listedAt = Date.parse(outcome.listedAt);
  if (!Number.isFinite(listedAt)) return null;
  return Math.max(0, Math.floor((now.getTime() - listedAt) / DAY_MS));
}

export function buildFollowUpActions(
  outcome: ProjectOutcome | undefined,
  now = new Date(),
): FollowUpAction[] {
  if (!outcome || outcome.saleStatus !== 'pending') return [];
  const age = listingAgeDays(outcome, now);
  if (age === null) return [];
  const actions: FollowUpAction[] = [];
  if (age >= 3) {
    actions.push({
      id: 'follow-up-3-photos',
      afterDays: 3,
      kind: 'photos',
      titleKey: 'followUp3Title',
      reasonKey: 'followUp3Reason',
      basis: 'general-rule',
    });
  }
  if (age >= 7) {
    actions.push({
      id: 'follow-up-7-price',
      afterDays: 7,
      kind: 'price',
      titleKey: 'followUp7Title',
      reasonKey: 'followUp7Reason',
      basis: 'general-rule',
    });
  }
  if (age >= 14) {
    actions.push({
      id: 'follow-up-14-description',
      afterDays: 14,
      kind: 'description',
      titleKey: 'followUp14Title',
      reasonKey: 'followUp14Reason',
      basis: 'general-rule',
    });
  }
  return actions;
}

export const followUpService = { buildActions: buildFollowUpActions, ageDays: listingAgeDays };
