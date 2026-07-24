import { useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { PhotoAssessment, ProjectStatus, ProjectSummary } from '@core/types';
import { SectionCard } from '@shared/components/SectionCard';
import { Dialog } from '@shared/components/Dialog';
import { imageIntakeService, type RejectedImageIntake } from '@core/services/imageIntakeService';

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
  photoAssessments: PhotoAssessment[];
}

const STATUS_ORDER: ProjectStatus[] = ['draft', 'ready', 'listed', 'sold', 'paused'];
const MAX_PROJECT_NAME_LENGTH = 200;

function projectCardStage(project: ProjectSummary) {
  const nextIssue = project.readiness.issues.find(
    (issue) => issue.id === project.readiness.nextAction?.id,
  );
  const stageId =
    nextIssue?.stage ??
    (['item', 'price', 'listing'] as const).find(
      (candidate) => !project.readiness.stages[candidate].ready,
    ) ??
    (['listed', 'sold', 'paused'].includes(project.status) ? 'follow-up' : 'listing');
  return project.readiness.stages[stageId];
}

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
  const [quickImages, setQuickImages] = useState<string[]>([]);
  const [quickImageNames, setQuickImageNames] = useState<string[]>([]);
  const [quickAssessments, setQuickAssessments] = useState<PhotoAssessment[]>([]);
  const [quickImageErrors, setQuickImageErrors] = useState<RejectedImageIntake[]>([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<ProjectSummary | null>(null);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [renameProjectTarget, setRenameProjectTarget] = useState<ProjectSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);

  const createFromQuickStart = async () => {
    if (!displayName.trim() || !description.trim()) return;
    setCreating(true);
    onCreate({
      displayName: displayName.trim(),
      description: description.trim(),
      images: quickImages,
      photoAssessments: quickAssessments,
    });
    setCreating(false);
  };
  const intakeQuickStartFiles = async (selectedFiles: Iterable<File>) => {
    setProcessingImages(true);
    const result = await imageIntakeService.intake(selectedFiles, {
      images: quickImages,
      assessments: quickAssessments,
    });
    setQuickImages(result.images);
    setQuickAssessments(result.assessments);
    setQuickImageNames((names) => [
      ...names,
      ...result.accepted.map((accepted) => accepted.fileName),
    ]);
    setQuickImageErrors(result.rejected);
    setProcessingImages(false);
  };
  const removeQuickStartImage = (index: number) => {
    const next = imageIntakeService.remove(
      { images: quickImages, assessments: quickAssessments },
      index,
    );
    setQuickImages(next.images);
    setQuickAssessments(next.assessments);
    setQuickImageNames((names) => names.filter((_, currentIndex) => currentIndex !== index));
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
      const severity = {
        blocker: 0,
        warning: 1,
        improvement: 2,
        'optional-research': 3,
      };
      const leftSeverity = left.readiness.nextAction
        ? severity[left.readiness.nextAction.severity]
        : 4;
      const rightSeverity = right.readiness.nextAction
        ? severity[right.readiness.nextAction.severity]
        : 4;
      return (
        leftSeverity - rightSeverity ||
        (left.readiness.nextAction?.priority ?? 100) -
          (right.readiness.nextAction?.priority ?? 100) ||
        left.updatedAt.localeCompare(right.updatedAt)
      );
    })
    .slice(0, 3);
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>, projectId: string) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    } else if (event.key === 'ArrowUp') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setMenuProjectId(null);
      requestAnimationFrame(() => document.getElementById(`project-actions-${projectId}`)?.focus());
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  };

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
                void intakeQuickStartFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <span>{t('quickStartImages')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  void intakeQuickStartFiles(Array.from(event.target.files ?? []));
                  event.target.value = '';
                }}
              />
              <small>
                {processingImages
                  ? t('imageIntakeProcessing')
                  : t('quickStartImageCount', { count: quickImages.length })}
              </small>
            </label>
            {quickImageErrors.length > 0 && (
              <div className="inline-warning" role="alert">
                <strong>{t('imageIntakeRejected')}</strong>
                <ul>
                  {quickImageErrors.map((rejection, index) => (
                    <li key={`${rejection.fileName}-${index}`}>
                      {rejection.fileName}: {t(`imageIntakeError_${rejection.code}`)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {quickImages.length > 0 && (
              <ul className="quick-start-image-list" aria-label={t('quickStartImagePreviews')}>
                {quickImages.map((image, index) => (
                  <li key={`${quickImageNames[index] ?? 'image'}-${index}`}>
                    <img
                      src={image}
                      alt={quickImageNames[index] ?? t('imageReference', { count: index + 1 })}
                    />
                    <span>{quickImageNames[index]}</span>
                    <small>
                      {quickAssessments[index]
                        ? `${quickAssessments[index].width}×${quickAssessments[index].height}`
                        : ''}
                    </small>
                    <button type="button" onClick={() => removeQuickStartImage(index)}>
                      {t('remove')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="quick-start-actions">
              <button type="submit" disabled={creating || processingImages}>
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
                  <span>
                    {project.readiness.nextAction
                      ? t(project.readiness.nextAction.titleKey)
                      : t('coachAllClear')}
                  </span>
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
            {visible.map((project) => {
              const currentStage = projectCardStage(project);
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    className="project-list__open"
                    onClick={() => onOpen(project.id)}
                  >
                    <span>
                      <strong>{project.title}</strong>
                      <small className="project-list__meta">
                        <span>
                          {t('readinessStageLabel')}:{' '}
                          {t(`projectSection_${currentStage.targetSection}`)}
                          {' · '}
                          {t(`readinessStage_${currentStage.state}`, {
                            count: currentStage.blockerCount,
                          })}
                        </span>
                        <span>
                          {t('nextBestAction')}:{' '}
                          {project.readiness.nextAction
                            ? t(project.readiness.nextAction.titleKey)
                            : t('coachAllClear')}
                        </span>
                        <span>
                          {project.readiness.blockerCount > 0
                            ? t('readinessBlockerCount', {
                                count: project.readiness.blockerCount,
                              })
                            : t('projectReadyForCopy')}{' '}
                          · {t('lastSaved')}:{' '}
                          {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(project.updatedAt))}
                        </span>
                      </small>
                    </span>
                    <span>
                      {project.selectedPriceSek === null
                        ? t('noNumericPrice')
                        : `${project.selectedPriceSek} SEK`}
                      {project.selectedMarketplace
                        ? ` · ${t(`marketplace_${project.selectedMarketplace}`)}`
                        : ''}
                    </span>
                  </button>
                  <button
                    id={`project-actions-${project.id}`}
                    type="button"
                    className="project-overflow-trigger"
                    aria-haspopup="menu"
                    aria-controls={`project-menu-${project.id}`}
                    aria-expanded={menuProjectId === project.id}
                    aria-label={`${t('projectActions')}: ${project.title}`}
                    onClick={() => {
                      const opening = menuProjectId !== project.id;
                      setMenuProjectId(opening ? project.id : null);
                      if (opening) {
                        requestAnimationFrame(() => {
                          document
                            .querySelector<HTMLButtonElement>(
                              `#project-menu-${project.id} [role="menuitem"]`,
                            )
                            ?.focus();
                        });
                      }
                    }}
                  >
                    •••
                  </button>
                  {menuProjectId === project.id && (
                    <div
                      id={`project-menu-${project.id}`}
                      className="project-overflow-menu"
                      role="menu"
                      aria-labelledby={`project-actions-${project.id}`}
                      onKeyDown={(event) => handleMenuKeyDown(event, project.id)}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setRenameProjectTarget(project);
                          setRenameValue(project.displayName);
                          setRenameError(null);
                          setMenuProjectId(null);
                        }}
                      >
                        {t('rename')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onArchive(project.id, !project.archivedAt);
                          setMenuProjectId(null);
                        }}
                      >
                        {project.archivedAt ? t('unarchive') : t('archive')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="button-danger-quiet"
                        onClick={() => {
                          setLastRemoved(project);
                          onRemove(project.id);
                          setMenuProjectId(null);
                        }}
                      >
                        {t('moveToTrash')}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
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
                onClick={() => setShowEmptyTrashDialog(true)}
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

      <Dialog
        open={Boolean(renameProjectTarget)}
        title={t('renameProjectTitle')}
        description={t('renameProjectDescription')}
        closeLabel={t('closeDialog')}
        onClose={() => {
          setRenameProjectTarget(null);
          setRenameError(null);
        }}
        actions={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setRenameProjectTarget(null)}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                const normalized = renameValue.trim();
                if (!normalized) {
                  setRenameError(t('projectNameRequired'));
                  return;
                }
                if (normalized.length > MAX_PROJECT_NAME_LENGTH) {
                  setRenameError(t('projectNameTooLong'));
                  return;
                }
                if (renameProjectTarget) onRename(renameProjectTarget.id, normalized);
                setRenameProjectTarget(null);
                setRenameError(null);
              }}
            >
              {t('saveName')}
            </button>
          </>
        }
      >
        <label className="field">
          <span>{t('projectName')}</span>
          <input
            value={renameValue}
            maxLength={MAX_PROJECT_NAME_LENGTH + 1}
            onChange={(event) => {
              setRenameValue(event.target.value);
              setRenameError(null);
            }}
          />
        </label>
        {renameError && (
          <p className="field-error" role="alert">
            {renameError}
          </p>
        )}
      </Dialog>

      <Dialog
        open={showEmptyTrashDialog}
        title={t('emptyTrashDialogTitle')}
        description={t('confirmEmptyTrash')}
        closeLabel={t('closeDialog')}
        onClose={() => setShowEmptyTrashDialog(false)}
        destructive
        actions={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setShowEmptyTrashDialog(false)}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="button-danger-quiet"
              onClick={() => {
                onEmptyTrash();
                setShowEmptyTrashDialog(false);
              }}
            >
              {t('emptyTrashPermanently')}
            </button>
          </>
        }
      />
    </div>
  );
}
