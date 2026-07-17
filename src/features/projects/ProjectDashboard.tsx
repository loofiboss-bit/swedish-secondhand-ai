import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectStatus, ProjectSummary } from '@core/types';
import { SectionCard } from '@shared/components/SectionCard';

interface ProjectDashboardProps {
  mode: 'home' | 'library';
  projects: ProjectSummary[];
  onCreate: (input?: ProjectQuickStartInput) => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}

export interface ProjectQuickStartInput {
  displayName: string;
  description: string;
  images: string[];
}

async function filesToDataUrls(files: File[]): Promise<string[]> {
  return Promise.all(
    files.slice(0, 6).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error ?? new Error('Image could not be read.'));
          reader.readAsDataURL(file);
        }),
    ),
  );
}

const STATUS_ORDER: ProjectStatus[] = ['draft', 'ready', 'listed', 'sold', 'paused'];

export function ProjectDashboard({
  mode,
  projects,
  onCreate,
  onOpen,
  onRemove,
}: ProjectDashboardProps) {
  const { t, i18n } = useTranslation('common');
  const [showQuickStart, setShowQuickStart] = useState(projects.length === 0);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const createFromQuickStart = async () => {
    if (!displayName.trim() || !description.trim()) return;
    setCreating(true);
    const images = await filesToDataUrls(files);
    onCreate({ displayName: displayName.trim(), description: description.trim(), images });
    setCreating(false);
  };
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
  const prioritized = projects
    .filter((project) => project.status !== 'sold')
    .sort((left, right) => {
      const priority: Record<ProjectStatus, number> = {
        listed: 1,
        draft: 2,
        paused: 3,
        ready: 4,
        sold: 5,
      };
      return priority[left.status] - priority[right.status];
    })
    .slice(0, 3);

  return (
    <div className="project-dashboard">
      {mode === 'home' && (
        <section className="project-hero">
          <div>
            <p className="eyebrow">{t('localSellerWorkspace')}</p>
            <h2>{t('projectHomeTitle')}</h2>
            <p>{t('projectHomeIntro')}</p>
          </div>
          <button type="button" onClick={() => setShowQuickStart(true)}>
            {t('newProject')}
          </button>
        </section>
      )}

      {showQuickStart && (
        <SectionCard title={t('quickStartTitle')}>
          <form
            className="quick-start-form"
            onSubmit={(event) => {
              event.preventDefault();
              void createFromQuickStart();
            }}
          >
            <label className="field">
              <span>{t('projectName')}</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={200}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>{t('itemDescription')}</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={4}
              />
            </label>
            <label
              className="quick-start-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                setFiles(Array.from(event.dataTransfer.files).slice(0, 6));
              }}
            >
              <span>{t('quickStartImages')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 6))}
              />
              <small>{t('quickStartImageCount', { count: files.length })}</small>
            </label>
            <div className="quick-start-actions">
              <button type="submit" disabled={creating}>
                {creating ? t('creatingProject') : t('createAndContinue')}
              </button>
              {projects.length > 0 && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setShowQuickStart(false)}
                >
                  {t('cancel')}
                </button>
              )}
            </div>
          </form>
        </SectionCard>
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

      {mode === 'home' && prioritized.length > 0 && (
        <SectionCard title={t('highestPriorityActions')}>
          <ul className="home-coach-list">
            {prioritized.map((project) => (
              <li key={project.id}>
                <div>
                  <strong>{project.title}</strong>
                  <span>{t(`homeCoach_${project.status}`)}</span>
                </div>
                <button type="button" onClick={() => onOpen(project.id)}>
                  {t('openCoachAction')}
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title={mode === 'home' ? t('recentProjects') : t('allProjects')}
        action={
          mode === 'library' ? (
            <button type="button" onClick={() => setShowQuickStart(true)}>
              {t('newProject')}
            </button>
          ) : undefined
        }
      >
        {visible.length === 0 ? (
          <div className="empty-state">
            <h3>{t('noProjects')}</h3>
            <p>{t('noProjectsHint')}</p>
            {!showQuickStart && (
              <button type="button" onClick={() => setShowQuickStart(true)}>
                {t('createFirstProject')}
              </button>
            )}
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
                      {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(project.updatedAt))}
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
