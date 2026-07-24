import { useTranslation } from 'react-i18next';
import type { ProjectStatus } from '@core/types';
import { useProjectStore } from '@core/store/useProjectStore';
import { SectionCard } from '@shared/components/SectionCard';

export function ProjectFollowUpPanel() {
  const { t } = useTranslation('common');
  const { activeProject, setActiveStatus } = useProjectStore();
  if (!activeProject) return null;

  const update = (status: ProjectStatus) => void setActiveStatus(status);
  return (
    <SectionCard title={t('projectSection_follow-up')}>
      <p>{t('followUpFoundation')}</p>
      <p>
        {t('projectStatusLabel')}: <strong>{t(`projectStatus_${activeProject.status}`)}</strong>
      </p>
      <div className="inline-actions">
        <button type="button" onClick={() => update('listed')}>
          {t('markProjectListed')}
        </button>
        <button type="button" onClick={() => update('sold')}>
          {t('markSold')}
        </button>
        <button type="button" onClick={() => update('paused')}>
          {t('pauseProject')}
        </button>
      </div>
    </SectionCard>
  );
}
