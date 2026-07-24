import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCategoryProfile } from '@core/services/categoryProfileService';
import { imageIntakeService, type RejectedImageIntake } from '@core/services/imageIntakeService';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { ContextualError } from '@shared/components/ContextualError';
import { SectionCard } from '@shared/components/SectionCard';
import { AnalysisEvidenceDrawer } from './components/AnalysisEvidenceDrawer';
import { ItemFactsReview } from './components/ItemFactsReview';
import { PhotoIntakeSection } from './components/PhotoIntakeSection';

interface AnalyzePanelProps {
  onContinue?: () => void;
}

export function AnalyzePanel({ onContinue }: AnalyzePanelProps) {
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
  const [rejectedImages, setRejectedImages] = useState<RejectedImageIntake[]>([]);
  const categoryProfile = useMemo(
    () => getCategoryProfile(productFacts?.category.value),
    [productFacts?.category.value],
  );

  const handleFiles = async (files: Iterable<File>) => {
    const current = useValuationStore.getState();
    const result = await imageIntakeService.intake(files, {
      images: current.images,
      assessments: current.photoAssessments,
    });
    result.accepted.forEach((accepted) => addImage(accepted.dataUrl, accepted.assessment));
    setRejectedImages(result.rejected);
  };

  const primaryAction = loading ? (
    <button type="button" onClick={cancelAnalysis}>
      {t('cancelAnalysis')}
    </button>
  ) : productFacts ? (
    <button type="button" onClick={onContinue}>
      {t('continueToPrice')}
    </button>
  ) : (
    <button type="button" onClick={() => void analyzeItem()}>
      {error ? t('retryIdentifyItem') : t('analyzeItem')}
    </button>
  );

  return (
    <SectionCard
      title={t('itemWorkspaceTitle')}
      action={<div className="item-primary-action">{primaryAction}</div>}
    >
      <ContextualError code={stepErrors.analyze || error} />

      <div className="item-intake-grid">
        <section className="item-intake-summary" aria-labelledby="item-description-title">
          <header>
            <div>
              <p className="eyebrow">{t('itemStepLabel')}</p>
              <h3 id="item-description-title">{t('describeWhatYouAreSelling')}</h3>
            </div>
            {fingerprint && (
              <span className="confidence-chip">
                {t('confidence')}: {Math.round(fingerprint.confidence * 100)}%
              </span>
            )}
          </header>
          <label className="field">
            <span>{t('itemDescription')}</span>
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              rows={4}
              placeholder={t('itemDescriptionExample')}
            />
          </label>
        </section>

        <PhotoIntakeSection
          images={images}
          assessments={photoAssessments}
          profile={categoryProfile}
          rejected={rejectedImages}
          onFiles={handleFiles}
          onRemove={removeImage}
          onRoleChange={setPhotoRole}
        />
      </div>

      {productFacts && (
        <section
          id="item-analysis"
          tabIndex={-1}
          className="detected-item focused-item-review"
          aria-labelledby="reviewed-facts-title"
        >
          <header>
            <div>
              <p className="eyebrow">{t(`category_${categoryProfile.id}`)}</p>
              <h3 id="reviewed-facts-title">{t('reviewedFacts')}</h3>
            </div>
            <span>{t('sellerEditsStayAuthoritative')}</span>
          </header>
          <ItemFactsReview
            facts={productFacts}
            profile={categoryProfile}
            onFactChange={updateFact}
            onListChange={updateListFact}
            onAttributeChange={updateAttribute}
            onTestedChange={setTestedStatus}
            onAuthenticityChange={setAuthenticityStatus}
            onLockChange={setFactLocked}
          />
          <AnalysisEvidenceDrawer candidates={factCandidates} knowledgeGaps={knowledgeGaps} />
        </section>
      )}

      <details className="secondary-workflow-actions">
        <summary>{t('moreItemActions')}</summary>
        <div className="inline-actions">
          <button type="button" onClick={() => void analyzeItem()} disabled={loading}>
            {t('reanalyzeItem')}
          </button>
          <button type="button" onClick={() => void runPipeline()} disabled={loading}>
            {t('runFullPipeline')}
          </button>
        </div>
      </details>
    </SectionCard>
  );
}
