import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectStatus, ProjectSummary } from '@core/types';
import { SectionCard } from '@shared/components/SectionCard';

interface ProjectDashboardProps {
  mode: 'home' | 'library';
  projects: ProjectSummary[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}

const STATUS_ORDER: ProjectStatus[] = ['draft', 'ready', 'listed', 'sold', 'paused'];

export function ProjectDashboard({
  mode,
  projects,
  onCreate,
  onOpen,
  onRemove,
}: ProjectDashboardProps) {
  const { t } = useTranslation('common');
  const counts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_ORDER.map((status) => [
          status,
          projects.filter((project) => project.status === status).length,
        ]),
      ) as Record<ProjectStatus, number>,
    [projects],
  );
  const visible = mode === 'home' ? projects.slice(0, 5) : projects;

  return (
    <div className="project-dashboard">
      {mode === 'home' && (
        <section className="project-hero">
          <div>
            <p className="eyebrow">{t('localSellerWorkspace')}</p>
            <h2>{t('projectHomeTitle')}</h2>
            <p>{t('projectHomeIntro')}</p>
          </div>
          <button type="button" onClick={onCreate}>
            {t('newProject')}
          </button>
        </section>
      )}

      {mode === 'home' && (
        <div className="project-stats" aria-label={t('projectStatusSummary')}>
          {STATUS_ORDER.map((status) => (
            <div key={status} className="project-stat">
              <strong>{counts[status]}</strong>
              <span>{t(`projectStatus_${status}`)}</span>
            </div>
          ))}
        </div>
      )}

      <SectionCard
        title={mode === 'home' ? t('recentProjects') : t('allProjects')}
        action={
          mode === 'library' ? (
            <button type="button" onClick={onCreate}>
              {t('newProject')}
            </button>
          ) : undefined
        }
      >
        {visible.length === 0 ? (
          <div className="empty-state">
            <h3>{t('noProjects')}</h3>
            <p>{t('noProjectsHint')}</p>
            <button type="button" onClick={onCreate}>
              {t('createFirstProject')}
            </button>
          </div>
        ) : (
          <ul className="project-list">
            {visible.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="project-list__open"
                  onClick={() => onOpen(project.id)}
                >
                  <span>
                    <strong>{project.title}</strong>
                    <small>
                      {t(`projectStatus_${project.status}`)} ·{' '}
                      {new Date(project.updatedAt).toLocaleString()}
                    </small>
                  </span>
                  <span>
                    {project.recommendedPriceSek === null
                      ? t('noNumericPrice')
                      : `${project.recommendedPriceSek} SEK`}
                  </span>
                </button>
                <button
                  type="button"
                  className="button-danger-quiet"
                  onClick={() => onRemove(project.id)}
                  aria-label={`${t('removeProject')}: ${project.title}`}
                >
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
