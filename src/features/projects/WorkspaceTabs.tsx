import { useTranslation } from 'react-i18next';
import type { ProjectReadiness, ProjectReadinessStageId, ProjectSection } from '@core/types';

interface WorkspaceTabsProps {
  active: ProjectSection;
  readiness: ProjectReadiness;
  onChange: (section: ProjectSection) => void;
}

const SECTIONS: ProjectSection[] = ['item', 'market', 'listing', 'follow-up'];

const STAGE_BY_SECTION: Record<ProjectSection, ProjectReadinessStageId> = {
  item: 'item',
  market: 'price',
  listing: 'listing',
  'follow-up': 'follow-up',
};

export function WorkspaceTabs({ active, readiness, onChange }: WorkspaceTabsProps) {
  const { t } = useTranslation('common');
  return (
    <nav className="workspace-tabs" aria-label={t('projectWorkspace')}>
      {SECTIONS.map((section) => {
        const stage = readiness.stages[STAGE_BY_SECTION[section]];
        return (
          <button
            key={section}
            type="button"
            className={active === section ? 'is-active' : ''}
            aria-current={active === section ? 'page' : undefined}
            onClick={() => onChange(section)}
          >
            <span>{t(`projectSection_${section}`)}</span>
            <small className={`workspace-tab-state workspace-tab-state--${stage.state}`}>
              {t(`readinessStage_${stage.state}`, { count: stage.blockerCount })}
            </small>
          </button>
        );
      })}
    </nav>
  );
}
