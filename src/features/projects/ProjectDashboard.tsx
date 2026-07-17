import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectStatus, ProjectSummary } from '@core/types';
import { SectionCard } from '@shared/components/SectionCard';

interface ProjectDashboardProps {
  mode: 'home' | 'library';
  projects: ProjectSummary[];
  trash: ProjectSummary[];
  onCreate: (input?: ProjectQuickStartInput) => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
  onEmptyTrash: () => void;
  onRename: (id: string, displayName: string) => void;
  onArchive: (id: string, archived: boolean) => void;
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
  trash,
  onCreate,
  onOpen,
  onRemove,
  onRestore,
  onEmptyTrash,
  onRename,
  onArchive,
}: ProjectDashboardProps) {
  const { t, i18n } = useTranslation('common');
  const [showQuickStart, setShowQuickStart] = useState(projects.length === 0);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<ProjectSummary | null>(null);

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
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.displayName
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesArchive = showArchived ? Boolean(project.archivedAt) : !project.archivedAt;
    return matchesSearch && matchesStatus && matchesArchive;
  });
  const visible = mode === 'home' ? filteredProjects.slice(0, 5) : filteredProjects;
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
        {mode === 'library' && (
          <div className="project-filters">
            <label className="field">
              <span>{t('searchProjects')}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('filterByStatus')}</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | ProjectStatus)}
              >
                <option value="all">{t('allStatuses')}</option>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {t(`projectStatus_${status}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              {t('showArchived')}
            </label>
          </div>
        )}
        {lastRemoved && (
          <div className="undo-banner" role="status">
            <span>{t('projectMovedToTrash', { name: lastRemoved.displayName })}</span>
            <button
              type="button"
              onClick={() => {
                onRestore(lastRemoved.id);
                setLastRemoved(null);
              }}
            >
              {t('undo')}
            </button>
          </div>
        )}
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
                  onClick={() => {
                    setLastRemoved(project);
                    onRemove(project.id);
                  }}
                  aria-label={`${t('removeProject')}: ${project.title}`}
                >
                  {t('remove')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt(t('renameProjectPrompt'), project.displayName);
                    if (name?.trim()) onRename(project.id, name.trim());
                  }}
                >
                  {t('rename')}
                </button>
                <button type="button" onClick={() => onArchive(project.id, !project.archivedAt)}>
                  {project.archivedAt ? t('unarchive') : t('archive')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {mode === 'library' && (
        <SectionCard
          title={`${t('trash')} (${trash.length})`}
          action={
            trash.length > 0 ? (
              <button
                type="button"
                className="button-danger-quiet"
                onClick={() => {
                  if (window.confirm(t('confirmEmptyTrash'))) onEmptyTrash();
                }}
              >
                {t('emptyTrash')}
              </button>
            ) : undefined
          }
        >
          {trash.length === 0 ? (
            <p>{t('trashEmpty')}</p>
          ) : (
            <ul className="project-list project-list--trash">
              {trash.map((project) => (
                <li key={project.id}>
                  <strong>{project.displayName}</strong>
                  <button type="button" onClick={() => onRestore(project.id)}>
                    {t('restore')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
}
