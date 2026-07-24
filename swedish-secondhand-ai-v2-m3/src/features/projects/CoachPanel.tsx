import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectSection, ProjectStatus } from '@core/types';
import { evaluateCoach } from '@core/services/coachEngine';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';

interface CoachPanelProps {
  projectStatus: ProjectStatus;
  onNavigate: (section: ProjectSection, targetId?: string) => void;
}

export function CoachPanel({ projectStatus, onNavigate }: CoachPanelProps) {
  const { t } = useTranslation('common');
  const facts = useValuationStore((state) => state.productFacts);
  const photos = useValuationStore((state) => state.photoAssessments);
  const traderaComps = useValuationStore((state) => state.traderaComps);
  const manualComps = useValuationStore((state) => state.manualComps);
  const valuation = useValuationStore((state) => state.valuation);
  const listings = useListingStore((state) => state.templates);
  const result = useMemo(
    () =>
      evaluateCoach({
        facts,
        photos,
        comparables: [...traderaComps, ...manualComps],
        valuation,
        listings,
        projectStatus,
      }),
    [facts, photos, traderaComps, manualComps, valuation, listings, projectStatus],
  );

  return (
    <section className="coach-panel" aria-labelledby="coach-title">
      <header>
        <div>
          <p className="eyebrow">{t('sellerCoach')}</p>
          <h3 id="coach-title">{t('nextBestActions')}</h3>
        </div>
        <span>{t('coachActionCount', { count: result.actions.length })}</span>
      </header>
      {result.actions.length === 0 ? (
        <p>{t('coachAllClear')}</p>
      ) : (
        <ol className="coach-actions">
          {result.actions.slice(0, 3).map((coachAction) => (
            <li
              key={coachAction.id}
              className={`coach-action coach-action--${coachAction.severity}`}
            >
              <div>
                <strong>{t(coachAction.titleKey)}</strong>
                <p>{t(coachAction.reasonKey)}</p>
                <small>
                  {t('expectedImpact')}: {t(coachAction.impactKey)}
                </small>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(coachAction.targetSection, coachAction.targetId)}
              >
                {t('openCoachAction')}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
