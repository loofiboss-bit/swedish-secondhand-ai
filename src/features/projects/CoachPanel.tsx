import { useTranslation } from 'react-i18next';
import type { ProjectSection, ProjectStatus } from '@core/types';
import { useActiveProjectReadiness } from '@core/store/useActiveProjectReadiness';

interface CoachPanelProps {
  projectStatus: ProjectStatus;
  onNavigate: (section: ProjectSection, targetId?: string) => void;
}

export function CoachPanel({ projectStatus, onNavigate }: CoachPanelProps) {
  const { t } = useTranslation('common');
  const readiness = useActiveProjectReadiness(projectStatus);
  const nextAction = readiness.nextAction;
  const remainingIssues = readiness.issues.filter((item) => item.id !== nextAction?.id);

  return (
    <section className="coach-panel" aria-labelledby="coach-title">
      <header>
        <div>
          <p className="eyebrow">{t('sellerCoach')}</p>
          <h3 id="coach-title">{t('nextBestAction')}</h3>
        </div>
        <span>{t('readinessBlockerCount', { count: readiness.blockerCount })}</span>
      </header>
      {!nextAction ? (
        <p>{t('coachAllClear')}</p>
      ) : (
        <ol className="coach-actions">
          <li key={nextAction.id} className={`coach-action coach-action--${nextAction.severity}`}>
            <div>
              <strong>{t(nextAction.titleKey)}</strong>
              <p>{t(nextAction.reasonKey)}</p>
              <small>
                {t('expectedImpact')}: {t(nextAction.impactKey)}
              </small>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(nextAction.targetSection, nextAction.targetId)}
            >
              {t('openCoachAction')}
            </button>
          </li>
        </ol>
      )}
      {remainingIssues.length > 0 && (
        <details className="coach-all-actions">
          <summary>{t('showAllCoachActions', { count: readiness.issues.length })}</summary>
          <ol>
            {remainingIssues.map((readinessIssue) => (
              <li key={readinessIssue.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(readinessIssue.targetSection, readinessIssue.targetId)}
                >
                  {t(readinessIssue.titleKey)}
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
