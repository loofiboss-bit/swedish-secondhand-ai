import { ChangeEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PhotoRole, ProductFactKey, ProductListFactKey } from '@core/types';
import { getCategoryProfile, isRequirementComplete } from '@core/services/categoryProfileService';
import { photoAssessmentService } from '@core/services/photoAssessmentService';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { SectionCard } from '@shared/components/SectionCard';

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function AnalyzePanel() {
  const { t } = useTranslation('common');
  const {
    inputText,
    images,
    fingerprint,
    productFacts,
    factCandidates,
    knowledgeGaps,
    photoAssessments,
    loading,
    error,
    setInputText,
    addImage,
    removeImage,
    setPhotoRole,
    updateFact,
    updateListFact,
    updateAttribute,
    setTestedStatus,
    setAuthenticityStatus,
    setFactLocked,
    analyzeItem,
    cancelAnalysis,
    runPipeline,
  } = useValuationStore();
  const { stepErrors } = useWorkflowStore();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const categoryProfile = useMemo(
    () => getCategoryProfile(productFacts?.category.value),
    [productFacts?.category.value],
  );

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;
    setUploadError(null);
    let acceptedCount = images.length;

    for (const file of Array.from(fileList)) {
      if (acceptedCount >= MAX_IMAGES) {
        setUploadError(t('imageLimitError', { count: MAX_IMAGES }));
        break;
      }
      if (/\.(?:heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
        setUploadError(t('heicNotSupported'));
        continue;
      }
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        setUploadError(t('imageTypeError'));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(t('imageSizeError'));
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        try {
          const current = useValuationStore.getState();
          const assessment = await photoAssessmentService.assessDataUrl(
            dataUrl,
            current.images.length,
            current.photoAssessments,
          );
          addImage(dataUrl, assessment);
        } catch {
          setUploadError(t('imageAssessmentError'));
        }
        if (useValuationStore.getState().images.length > acceptedCount) acceptedCount += 1;
      } catch {
        setUploadError(t('imageProcessingError'));
      }
    }

    event.target.value = '';
  };

  return (
    <SectionCard
      title={t('analyze')}
      action={
        <div className="inline-actions">
          <button type="button" onClick={() => void analyzeItem()} disabled={loading}>
            {t('analyzeItem')}
          </button>
          <button type="button" onClick={() => void runPipeline()} disabled={loading}>
            {t('runFullPipeline')}
          </button>
          {loading && (
            <button type="button" onClick={cancelAnalysis}>
              {t('cancelAnalysis')}
            </button>
          )}
        </div>
      }
    >
      {(error || stepErrors.analyze) && (
        <p className="inline-warning" role="alert">
          {stepErrors.analyze || error}
        </p>
      )}
      {uploadError && (
        <p className="inline-warning" role="alert">
          {uploadError}
        </p>
      )}

      <label className="field">
        <span>{t('itemDescription')}</span>
        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          rows={5}
          placeholder="Ex: IKEA Poang fåtölj i bra skick, grå klädsel"
        />
      </label>

      <label className="field">
        <span>{t('uploadImages')}</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void handleUpload(event)}
        />
      </label>

      {images.length > 0 && (
        <div id="photo-checklist" tabIndex={-1} className="photo-coach">
          <h3>{t('photoCoachTitle')}</h3>
          <ul className="photo-requirements">
            {categoryProfile.photos.map((requirement) => {
              const complete = photoAssessments.some(
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
            {images.map((image, index) => (
              <li key={`${image}-${index}`}>
                <img src={image} alt={`upload-${index + 1}`} loading="lazy" decoding="async" />
                {photoAssessments
                  .filter((assessment) => assessment.imageIndex === index)
                  .map((assessment) => (
                    <div className="photo-assessment" key={assessment.imageIndex}>
                      <label>
                        <span>{t('photoPurpose')}</span>
                        <select
                          value={assessment.role}
                          onChange={(event) => setPhotoRole(index, event.target.value as PhotoRole)}
                        >
                          {['cover', 'angle', 'defect', 'label_model', 'accessories'].map(
                            (role) => (
                              <option key={role} value={role}>
                                {t(`photoRole_${role}`)}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <small>
                        {assessment.width}×{assessment.height} · {t('brightness')}:{' '}
                        {Math.round(assessment.brightness * 100)}% · {t('sharpness')}:{' '}
                        {Math.round(assessment.sharpness * 100)}%
                      </small>
                      {assessment.issues.length === 0 ? (
                        <span className="photo-ok">{t('photoQualityGood')}</span>
                      ) : (
                        <ul className="photo-issues">
                          {assessment.issues.map((issue) => (
                            <li key={issue}>{t(`photoIssue_${issue}`)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                <button type="button" onClick={() => removeImage(index)}>
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fingerprint && productFacts && (
        <div
          id="item-analysis"
          tabIndex={-1}
          className="detected-item"
          aria-label={t('detectedItem')}
        >
          <h3>{t('detectedItem')}</h3>
          {(
            [
              ['title', t('title')],
              ['category', t('category')],
              ['brand', t('brand')],
              ['model', t('model')],
            ] as Array<[ProductFactKey, string]>
          ).map(([key, label]) => {
            const fact = productFacts[key];
            return (
              <label className="field" key={key} id={`fact-${key}`}>
                <span>
                  {label} — {t('factSource')}: {fact.source}
                </span>
                <input
                  key={`${key}-${fact.value}`}
                  defaultValue={String(fact.value)}
                  onBlur={(event) => updateFact(key, event.target.value)}
                />
                <span>
                  <input
                    type="checkbox"
                    checked={fact.locked}
                    onChange={(event) => setFactLocked(key, event.target.checked)}
                  />{' '}
                  {t('lockFact')}
                </span>
              </label>
            );
          })}
          <label className="field" id="fact-conditionGrade">
            <span>
              {t('condition')} — {t('factSource')}: {productFacts.conditionGrade.source}
            </span>
            <select
              value={productFacts.conditionGrade.value}
              onChange={(event) => updateFact('conditionGrade', event.target.value)}
            >
              {['new', 'like_new', 'good', 'fair', 'poor', 'unknown'].map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
            <span>
              <input
                type="checkbox"
                checked={productFacts.conditionGrade.locked}
                onChange={(event) => setFactLocked('conditionGrade', event.target.checked)}
              />{' '}
              {t('lockFact')}
            </span>
          </label>
          <section className="category-profile" aria-labelledby="category-profile-title">
            <h3 id="category-profile-title">
              {t('categoryProfileTitle')}: {categoryProfile.id}
            </h3>
            <ul className="fact-checklist">
              {categoryProfile.facts.map((requirement) => (
                <li
                  key={requirement.key}
                  className={
                    isRequirementComplete(productFacts, requirement.key) ? 'is-complete' : ''
                  }
                >
                  <span aria-hidden="true">
                    {isRequirementComplete(productFacts, requirement.key) ? '✓' : '○'}
                  </span>{' '}
                  {t(`profileFact_${requirement.key.replace('.', '_')}`, {
                    defaultValue: requirement.label,
                  })}{' '}
                  · {t(requirement.level)}
                </li>
              ))}
            </ul>
            {categoryProfile.facts
              .filter((requirement) => requirement.key.startsWith('attributes.'))
              .map((requirement) => {
                const key = requirement.key.slice('attributes.'.length);
                return (
                  <label className="field" key={requirement.key} id={`fact-attributes-${key}`}>
                    <span>
                      {t(`profileFact_${requirement.key.replace('.', '_')}`, {
                        defaultValue: requirement.label,
                      })}
                    </span>
                    <input
                      key={`${key}-${productFacts.attributes[key]?.value ?? ''}`}
                      defaultValue={productFacts.attributes[key]?.value ?? ''}
                      onBlur={(event) => updateAttribute(key, event.target.value)}
                    />
                  </label>
                );
              })}
          </section>
          {factCandidates.length > 0 && (
            <section className="fact-candidates" aria-labelledby="fact-candidates-title">
              <h3 id="fact-candidates-title">{t('factCandidatesTitle')}</h3>
              <p>{t('factCandidatesIntro')}</p>
              <ul>
                {factCandidates.map((candidate) => (
                  <li key={candidate.id}>
                    <strong>
                      {candidate.key}: {candidate.value}
                    </strong>
                    <span>
                      {t('factSource')}: {candidate.source} · {t('uncertainty')}:{' '}
                      {t(`uncertainty_${candidate.uncertainty}`)}
                    </span>
                    <small>
                      {candidate.references
                        .map((reference) =>
                          reference.kind === 'image'
                            ? t('imageReference', { count: Number(reference.index) + 1 })
                            : t('textReference'),
                        )
                        .join(', ')}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {knowledgeGaps.length > 0 && (
            <section className="knowledge-gaps">
              <h3>{t('knowledgeGapsTitle')}</h3>
              <ul>
                {knowledgeGaps.map((gap) => (
                  <li key={gap.key}>{t(gap.reasonKey)}</li>
                ))}
              </ul>
            </section>
          )}
          <label className="field" id="fact-authenticityStatus">
            <span>{t('authenticityStatus')}</span>
            <select
              value={productFacts.authenticityStatus.value}
              onChange={(event) =>
                setAuthenticityStatus(event.target.value as 'verified' | 'unverified' | 'unknown')
              }
            >
              <option value="verified">{t('authenticityVerified')}</option>
              <option value="unverified">{t('authenticityUnverified')}</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
          </label>
          {(
            [
              ['defects', t('defects')],
              ['includedAccessories', t('includedAccessories')],
              ['missingAccessories', t('missingAccessories')],
            ] as Array<[ProductListFactKey, string]>
          ).map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                defaultValue={productFacts[key].value.join(', ')}
                onBlur={(event) => updateListFact(key, event.target.value)}
                placeholder={t('commaSeparated')}
              />
            </label>
          ))}
          <label className="field" id="fact-testedStatus">
            <span>{t('testedStatus')}</span>
            <select
              value={productFacts.testedStatus.value}
              onChange={(event) =>
                setTestedStatus(event.target.value as 'tested' | 'untested' | 'unknown')
              }
            >
              <option value="tested">{t('tested')}</option>
              <option value="untested">{t('untested')}</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
          </label>
          <p>
            {t('confidence')}: {Math.round(fingerprint.confidence * 100)}%
          </p>
        </div>
      )}
    </SectionCard>
  );
}
