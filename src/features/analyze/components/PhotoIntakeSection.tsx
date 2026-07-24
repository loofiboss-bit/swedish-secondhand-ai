import { useTranslation } from 'react-i18next';
import type { PhotoAssessment, PhotoRole } from '@core/types';
import type { CategoryProfile } from '@core/services/categoryProfileService';
import type { RejectedImageIntake } from '@core/services/imageIntakeService';

interface PhotoIntakeSectionProps {
  images: string[];
  assessments: PhotoAssessment[];
  profile: CategoryProfile;
  rejected: RejectedImageIntake[];
  onFiles: (files: Iterable<File>) => Promise<void>;
  onRemove: (index: number) => void;
  onRoleChange: (index: number, role: PhotoRole) => void;
}

const PHOTO_ROLES: PhotoRole[] = ['cover', 'angle', 'defect', 'label_model', 'accessories'];

export function PhotoIntakeSection({
  images,
  assessments,
  profile,
  rejected,
  onFiles,
  onRemove,
  onRoleChange,
}: PhotoIntakeSectionProps) {
  const { t } = useTranslation('common');

  return (
    <section className="photo-intake" aria-labelledby="photo-intake-title">
      <header>
        <div>
          <p className="eyebrow">{t('optional')}</p>
          <h3 id="photo-intake-title">{t('photoSummary')}</h3>
        </div>
        <span>{t('quickStartImageCount', { count: images.length })}</span>
      </header>
      <label
        className="image-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void onFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <span>{t('uploadImages')}</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            if (event.target.files) void onFiles(Array.from(event.target.files));
            event.target.value = '';
          }}
        />
        <small>{t('imageIntakeSupportedFormats')}</small>
      </label>
      {rejected.length > 0 && (
        <div className="inline-warning" role="alert">
          <strong>{t('imageIntakeRejected')}</strong>
          <ul>
            {rejected.map((rejection, index) => (
              <li key={`${rejection.fileName}-${index}`}>
                {rejection.fileName}: {t(`imageIntakeError_${rejection.code}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {images.length > 0 && (
        <div id="photo-checklist" tabIndex={-1} className="photo-coach">
          <ul className="photo-requirements">
            {profile.photos.map((requirement) => {
              const complete = assessments.some(
                (assessment) => assessment.role === requirement.role,
              );
              return (
                <li key={requirement.role} className={complete ? 'is-complete' : ''}>
                  <span aria-hidden="true">{complete ? '✓' : '○'}</span>{' '}
                  {t(`photoRole_${requirement.role}`)} · {t(requirement.level)}
                </li>
              );
            })}
          </ul>
          <ul className="image-list">
            {images.map((image, index) => {
              const assessment = assessments.find((item) => item.imageIndex === index);
              return (
                <li key={`${image.slice(0, 32)}-${index}`}>
                  <img src={image} alt={t('imageReference', { count: index + 1 })} />
                  {assessment && (
                    <div className="photo-assessment">
                      <label>
                        <span>{t('photoPurpose')}</span>
                        <select
                          value={assessment.role}
                          onChange={(event) => onRoleChange(index, event.target.value as PhotoRole)}
                        >
                          {PHOTO_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {t(`photoRole_${role}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <small>
                        {assessment.width}×{assessment.height}
                      </small>
                      {assessment.issues.length > 0 && (
                        <ul className="photo-issues">
                          {assessment.issues.map((item) => (
                            <li key={item}>{t(`photoIssue_${item}`)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <button type="button" onClick={() => onRemove(index)}>
                    {t('remove')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
