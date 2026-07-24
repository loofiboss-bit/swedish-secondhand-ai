import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ListingDraftFieldKey, MarketplaceSite, SellerTimePreference } from '@core/types';
import { sellPlanService } from '@core/services/sellPlanService';
import { sitePolicyService } from '@core/services/sitePolicyService';
import { useActiveProjectReadiness } from '@core/store/useActiveProjectReadiness';
import { useListingStore } from '@core/store/useListingStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { Dialog } from '@shared/components/Dialog';
import { SectionCard } from '@shared/components/SectionCard';

const TITLE_LIMITS: Record<MarketplaceSite, number> = { tradera: 80, blocket: 70, vinted: 60 };

interface CopyState {
  site: MarketplaceSite;
  status: 'success' | 'error';
  text: string;
}

export function TemplatesPanel() {
  const { t } = useTranslation('common');
  const {
    listingDrafts,
    sellerTimePreference,
    sellPlan,
    updateListingField,
    moveImage,
    setCoverImage,
    getReadiness,
    setSellPlan,
    exportCopyBundle,
    selectedSite,
    setSelectedSite,
  } = useListingStore();
  const projectReadiness = useActiveProjectReadiness();
  const activeProject = useProjectStore((state) => state.activeProject);
  const {
    generateTemplates,
    images,
    productFacts,
    traderaComps,
    manualComps,
    valuation,
    localLearningSampleSize,
  } = useValuationStore();
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);

  const selectedMarketplace = selectedSite === 'all' ? listingDrafts[0]?.site : selectedSite;
  const editedFields = useMemo(
    () =>
      listingDrafts.flatMap((draft) =>
        Object.entries(draft.fields)
          .filter(([, field]) => field.userEdited)
          .map(([field]) => `${t(`marketplace_${draft.site}`)} · ${t(field)}`),
      ),
    [listingDrafts, t],
  );

  const handleCopy = async (site: MarketplaceSite, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState({ site, status: 'success', text });
    } catch {
      setCopyState({ site, status: 'error', text });
    }
  };

  const updateTimePreference = (preference: SellerTimePreference) => {
    if (!productFacts) return;
    setSellPlan(
      preference,
      sellPlanService.create({
        facts: productFacts,
        comparables: [...traderaComps, ...manualComps],
        valuation,
        timePreference: preference,
        ownHistorySampleSize: localLearningSampleSize,
      }),
    );
  };

  const openField = (site: MarketplaceSite, field: ListingDraftFieldKey | 'images') => {
    const target = document.getElementById(`listing-${site}-${field}`);
    const disclosure = target?.closest('details');
    if (disclosure instanceof HTMLDetailsElement) disclosure.open = true;
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const focusTarget = target?.matches('input, textarea, select, button, [tabindex]')
      ? target
      : target?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]');
    focusTarget?.focus({ preventScroll: true });
  };

  return (
    <SectionCard
      title={t('listingStudio')}
      action={
        <button type="button" onClick={() => generateTemplates(false)}>
          {t('regenerateUntouchedFields')}
        </button>
      }
    >
      <details className="sell-plan listing-plan">
        <summary>
          <span>{t('recommendedSellPlan')}</span>
          <small>
            {sellPlan ? t(`marketplace_${sellPlan.marketplace}`) : t('notGeneratedYet')}
          </small>
        </summary>
        <div className="listing-plan__body">
          <label>
            {t('timePreference')}
            <select
              value={sellerTimePreference}
              onChange={(event) => updateTimePreference(event.target.value as SellerTimePreference)}
            >
              <option value="fast">{t('timePreference_fast')}</option>
              <option value="balanced">{t('timePreference_balanced')}</option>
              <option value="patient">{t('timePreference_patient')}</option>
            </select>
          </label>
          {sellPlan && (
            <>
              <dl>
                <div>
                  <dt>{t('marketplace')}</dt>
                  <dd>{t(`marketplace_${sellPlan.marketplace}`)}</dd>
                </div>
                <div>
                  <dt>{t('saleFormat')}</dt>
                  <dd>{t(`saleFormat_${sellPlan.saleFormat}`)}</dd>
                </div>
                <div>
                  <dt>{t('fulfillment')}</dt>
                  <dd>{t(`fulfillment_${sellPlan.fulfillment}`)}</dd>
                </div>
              </dl>
              <ul>
                {sellPlan.rationale.map((reason) => (
                  <li key={reason.key}>{t(reason.key, reason.params)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </details>

      {listingDrafts.length === 0 ? (
        <div className="empty-state">
          <h3>{t('noListingDraft')}</h3>
          <p>{t('noListingDraftHint')}</p>
          <button type="button" onClick={() => generateTemplates(false)}>
            {t('createListingDrafts')}
          </button>
        </div>
      ) : (
        <>
          <div className="marketplace-tabs" role="tablist" aria-label={t('chooseMarketplace')}>
            {listingDrafts.map((draft) => (
              <button
                key={draft.site}
                type="button"
                role="tab"
                aria-selected={selectedMarketplace === draft.site}
                onClick={() => setSelectedSite(draft.site)}
              >
                {t(`marketplace_${draft.site}`)}
                {sellPlan?.marketplace === draft.site ? ` · ${t('recommendedMarketplace')}` : ''}
              </button>
            ))}
          </div>

          <div className="templates-grid" id="listing-studio" tabIndex={-1}>
            {listingDrafts
              .filter((draft) => draft.site === selectedMarketplace)
              .map((draft) => {
                const issues = getReadiness(draft.site);
                const blockers = issues.filter((issue) => issue.severity === 'blocker');
                const warnings = issues.filter((issue) => issue.severity === 'warning');
                const improvements = issues.filter((issue) => issue.severity === 'improvement');
                const policyMetadata = sitePolicyService.getMetadata(draft.site);
                const fieldId = (field: ListingDraftFieldKey | 'images') =>
                  `listing-${draft.site}-${field}`;
                const ready = blockers.length === 0 && projectReadiness.copyEligible;
                const textOnly = `${draft.fields.title.value}\n\n${draft.fields.description.value}`;

                return (
                  <article
                    key={draft.site}
                    className="template-card listing-editor listing-preview-card"
                  >
                    <header className="listing-preview-card__header">
                      <div>
                        <p className="eyebrow">{t(`marketplace_${draft.site}`)}</p>
                        <h3>{t('listingPreviewTitle')}</h3>
                      </div>
                      <span className={ready ? 'readiness-ready' : 'readiness-blocked'}>
                        {ready
                          ? t('listingReady')
                          : t('blockingIssueCount', {
                              count: projectReadiness.blockerCount,
                            })}
                      </span>
                    </header>

                    <div className="listing-preview-layout">
                      <div className="listing-preview-copy">
                        <label className="field" id={fieldId('title')}>
                          <span>
                            {t('title')} · {draft.fields.title.value.length}/
                            {TITLE_LIMITS[draft.site]}
                          </span>
                          <input
                            value={draft.fields.title.value}
                            maxLength={TITLE_LIMITS[draft.site]}
                            onChange={(event) =>
                              updateListingField(draft.site, 'title', event.target.value)
                            }
                          />
                        </label>
                        <label className="field" id={fieldId('description')}>
                          <span>{t('finalListingText')}</span>
                          <textarea
                            rows={9}
                            value={draft.fields.description.value}
                            onChange={(event) =>
                              updateListingField(draft.site, 'description', event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <aside className="listing-preview-facts">
                        {draft.coverImageIndex !== null && images[draft.coverImageIndex] ? (
                          <img
                            className="listing-cover"
                            src={images[draft.coverImageIndex]}
                            alt={t('squareCoverPreview')}
                          />
                        ) : (
                          <div className="listing-cover listing-cover--empty">
                            {t('noCoverSelected')}
                          </div>
                        )}
                        <label className="field" id={fieldId('priceSek')}>
                          <span>
                            {activeProject?.priceDecision.kind === 'user_entered'
                              ? t('yourPrice')
                              : t('priceSek')}
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={draft.fields.priceSek.value}
                            onChange={(event) =>
                              updateListingField(draft.site, 'priceSek', Number(event.target.value))
                            }
                          />
                        </label>
                        <label className="field" id={fieldId('shippingPickup')}>
                          <span>{t('shippingPickup')}</span>
                          <input
                            value={draft.fields.shippingPickup.value}
                            onChange={(event) =>
                              updateListingField(draft.site, 'shippingPickup', event.target.value)
                            }
                          />
                        </label>
                      </aside>
                    </div>

                    <section className="readiness-groups" aria-labelledby="listing-blockers-title">
                      <div>
                        <h4 id="listing-blockers-title">
                          {t('readiness_blocker')} ({blockers.length})
                        </h4>
                        {blockers.length === 0 ? (
                          <p>{t('noTrueListingBlockers')}</p>
                        ) : (
                          <ul>
                            {blockers.map((issue) => (
                              <li key={issue.id}>
                                <button
                                  type="button"
                                  onClick={() => openField(draft.site, issue.field)}
                                >
                                  {t(`readinessIssue_${issue.id}`, {
                                    defaultValue: issue.message,
                                  })}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>

                    <div className="template-actions">
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => void handleCopy(draft.site, exportCopyBundle(draft.site))}
                      >
                        {t('copyReadyListing')}
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => void handleCopy(draft.site, textOnly)}
                      >
                        {ready ? t('copyTextOnly') : t('copyTextOnlyIncomplete')}
                      </button>
                    </div>

                    {copyState?.site === draft.site && (
                      <div
                        className={`clipboard-status clipboard-status--${copyState.status}`}
                        role={copyState.status === 'error' ? 'alert' : 'status'}
                      >
                        <strong>
                          {copyState.status === 'success'
                            ? t('clipboardCopySucceeded')
                            : t('clipboardCopyFailed')}
                        </strong>
                        {copyState.status === 'error' && (
                          <>
                            <p>{t('clipboardManualFallback')}</p>
                            <textarea
                              readOnly
                              value={copyState.text}
                              aria-label={t('manualCopyText')}
                              onFocus={(event) => event.currentTarget.select()}
                            />
                          </>
                        )}
                      </div>
                    )}

                    <details className="listing-edit-section">
                      <summary>{t('marketplaceDetails')}</summary>
                      <div className="listing-detail-grid">
                        <label className="field" id={fieldId('category')}>
                          <span>{t('marketplaceCategory')}</span>
                          <input
                            value={draft.fields.category.value}
                            onChange={(event) =>
                              updateListingField(draft.site, 'category', event.target.value)
                            }
                          />
                        </label>
                        <label className="field" id={fieldId('attributes')}>
                          <span>{t('marketplaceAttributes')}</span>
                          <textarea
                            rows={3}
                            value={draft.fields.attributes.value.join('\n')}
                            onChange={(event) =>
                              updateListingField(
                                draft.site,
                                'attributes',
                                event.target.value
                                  .split('\n')
                                  .map((value) => value.trim())
                                  .filter(Boolean),
                              )
                            }
                          />
                        </label>
                        <label className="field" id={fieldId('tags')}>
                          <span>{t('tags')}</span>
                          <input
                            value={draft.fields.tags.value.join(', ')}
                            onChange={(event) =>
                              updateListingField(
                                draft.site,
                                'tags',
                                event.target.value
                                  .split(',')
                                  .map((value) => value.trim())
                                  .filter(Boolean),
                              )
                            }
                          />
                        </label>
                        <label className="field" id={fieldId('disclosure')}>
                          <span>{t('disclosure')}</span>
                          <textarea
                            rows={2}
                            value={draft.fields.disclosure.value}
                            onChange={(event) =>
                              updateListingField(draft.site, 'disclosure', event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </details>

                    <details className="listing-edit-section">
                      <summary>{t('imageOrderAndCover')}</summary>
                      <section className="listing-images" id={fieldId('images')} tabIndex={-1}>
                        <ol>
                          {draft.imageOrder.map((imageIndex, position) => (
                            <li key={imageIndex}>
                              <img
                                src={images[imageIndex]}
                                alt={t('imageReference', { count: imageIndex + 1 })}
                              />
                              <span>{position + 1}</span>
                              <button
                                type="button"
                                disabled={position === 0}
                                onClick={() => moveImage(draft.site, imageIndex, -1)}
                                aria-label={t('moveImageEarlier', { count: imageIndex + 1 })}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={position === draft.imageOrder.length - 1}
                                onClick={() => moveImage(draft.site, imageIndex, 1)}
                                aria-label={t('moveImageLater', { count: imageIndex + 1 })}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => setCoverImage(draft.site, imageIndex)}
                              >
                                {draft.coverImageIndex === imageIndex
                                  ? t('selectedCover')
                                  : t('useAsCover')}
                              </button>
                            </li>
                          ))}
                        </ol>
                      </section>
                    </details>

                    <details className="listing-edit-section">
                      <summary>
                        {t('warningsAndImprovements')} ({warnings.length + improvements.length})
                      </summary>
                      <ul>
                        {[...warnings, ...improvements].map((issue) => (
                          <li key={issue.id}>
                            <button
                              type="button"
                              onClick={() => openField(draft.site, issue.field)}
                            >
                              {t(`readinessIssue_${issue.id}`, { defaultValue: issue.message })}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>

                    <details className="listing-edit-section policy-source">
                      <summary>{t('policyProvenance')}</summary>
                      <p>
                        {t('policyVersion')}: {policyMetadata.version} · {t('policyChecked')}:{' '}
                        {new Date(policyMetadata.checkedAt).toLocaleDateString()}
                      </p>
                      <a href={policyMetadata.sourceUrl}>{policyMetadata.sourceUrl}</a>
                    </details>
                  </article>
                );
              })}
          </div>
        </>
      )}

      <button
        type="button"
        className="button-danger-quiet replace-listing-fields"
        onClick={() => setShowReplaceDialog(true)}
        disabled={listingDrafts.length === 0}
      >
        {t('replaceAllListingFields')}
      </button>

      <Dialog
        open={showReplaceDialog}
        title={t('replaceListingFieldsTitle')}
        description={t('replaceListingFieldsDescription')}
        closeLabel={t('closeDialog')}
        onClose={() => setShowReplaceDialog(false)}
        destructive
        actions={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setShowReplaceDialog(false)}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              className="button-danger-quiet"
              onClick={() => {
                generateTemplates(true);
                setShowReplaceDialog(false);
              }}
            >
              {t('replaceListedFields')}
            </button>
          </>
        }
      >
        {editedFields.length > 0 ? (
          <ul>
            {editedFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        ) : (
          <p>{t('noUserEditedFields')}</p>
        )}
      </Dialog>
    </SectionCard>
  );
}
