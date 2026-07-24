import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ListingDraftFieldKey, MarketplaceSite, SellerTimePreference } from '@core/types';
import { sellPlanService } from '@core/services/sellPlanService';
import { sitePolicyService } from '@core/services/sitePolicyService';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { SectionCard } from '@shared/components/SectionCard';

const TITLE_LIMITS: Record<MarketplaceSite, number> = { tradera: 80, blocket: 70, vinted: 60 };

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
  } = useListingStore();
  const { generateTemplates, images, productFacts, traderaComps, manualComps, valuation } =
    useValuationStore();
  const [copiedSite, setCopiedSite] = useState<string | null>(null);

  const handleCopy = async (site: MarketplaceSite, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSite(site);
    setTimeout(() => setCopiedSite(null), 1200);
  };

  const replaceAll = () => {
    if (window.confirm(t('confirmReplaceUserListingText'))) generateTemplates(true);
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
      }),
    );
  };

  const openField = (site: MarketplaceSite, field: ListingDraftFieldKey | 'images') => {
    const target = document.getElementById(`listing-${site}-${field}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusTarget = target?.matches('input, textarea, select, button, [tabindex]')
      ? target
      : target?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]');
    focusTarget?.focus({ preventScroll: true });
  };

  return (
    <SectionCard
      title={t('listingStudio')}
      action={
        <div className="inline-actions">
          <button type="button" onClick={() => generateTemplates(false)}>
            {t('regenerateUntouchedFields')}
          </button>
          <button type="button" className="button-danger-quiet" onClick={replaceAll}>
            {t('replaceAllListingFields')}
          </button>
        </div>
      }
    >
      <section className="sell-plan" aria-labelledby="sell-plan-title">
        <header>
          <div>
            <p className="eyebrow">{t('transparentSellPlan')}</p>
            <h3 id="sell-plan-title">{t('recommendedSellPlan')}</h3>
          </div>
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
        </header>
        {sellPlan ? (
          <div className="sell-plan__result">
            <dl>
              <div>
                <dt>{t('marketplace')}</dt>
                <dd>{sellPlan.marketplace}</dd>
              </div>
              <div>
                <dt>{t('saleFormat')}</dt>
                <dd>{t(`saleFormat_${sellPlan.saleFormat}`)}</dd>
              </div>
              <div>
                <dt>{t('pricingStrategy')}</dt>
                <dd>
                  {t(
                    `strategy${sellPlan.pricingStrategy === 'fast_sale' ? 'FastSale' : sellPlan.pricingStrategy === 'max_value' ? 'MaxValue' : 'Balanced'}`,
                  )}
                </dd>
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
            <p>
              {t('recommendationBasis')}:{' '}
              {sellPlan.basis.map((basis) => t(`basis_${basis}`)).join(', ')}
            </p>
          </div>
        ) : (
          <p>{t('generateListingsForSellPlan')}</p>
        )}
      </section>

      <div className="templates-grid" id="listing-studio" tabIndex={-1}>
        {listingDrafts.map((draft) => {
          const issues = getReadiness(draft.site);
          const policyMetadata = sitePolicyService.getMetadata(draft.site);
          const blockers = issues.filter((issue) => issue.severity === 'blocker');
          const warnings = issues.filter((issue) => issue.severity === 'warning');
          const improvements = issues.filter((issue) => issue.severity === 'improvement');
          const fieldId = (field: ListingDraftFieldKey | 'images') =>
            `listing-${draft.site}-${field}`;

          return (
            <article key={draft.site} className="template-card listing-editor">
              <header>
                <h3>{draft.site.toUpperCase()}</h3>
                <span className={blockers.length > 0 ? 'readiness-blocked' : 'readiness-ready'}>
                  {blockers.length > 0 ? t('listingBlocked') : t('listingReady')}
                </span>
              </header>

              <label className="field" id={fieldId('title')}>
                <span>
                  {t('title')} · {draft.fields.title.value.length}/{TITLE_LIMITS[draft.site]} ·{' '}
                  {t(`fieldOrigin_${draft.fields.title.origin}`)}
                </span>
                <input
                  value={draft.fields.title.value}
                  maxLength={TITLE_LIMITS[draft.site]}
                  onChange={(event) => updateListingField(draft.site, 'title', event.target.value)}
                />
              </label>
              <label className="field" id={fieldId('description')}>
                <span>
                  {t('description')} · {draft.fields.description.value.length} ·{' '}
                  {t(`fieldOrigin_${draft.fields.description.origin}`)}
                </span>
                <textarea
                  rows={10}
                  value={draft.fields.description.value}
                  onChange={(event) =>
                    updateListingField(draft.site, 'description', event.target.value)
                  }
                />
              </label>
              <label className="field" id={fieldId('priceSek')}>
                <span>
                  {t('priceSek')} · {t(`fieldOrigin_${draft.fields.priceSek.origin}`)}
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
              <label className="field" id={fieldId('category')}>
                <span>
                  {t('marketplaceCategory')} · {t(`fieldOrigin_${draft.fields.category.origin}`)}
                </span>
                <input
                  value={draft.fields.category.value}
                  onChange={(event) =>
                    updateListingField(draft.site, 'category', event.target.value)
                  }
                />
              </label>
              <label className="field" id={fieldId('attributes')}>
                <span>
                  {t('marketplaceAttributes')} ·{' '}
                  {t(`fieldOrigin_${draft.fields.attributes.origin}`)}
                </span>
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
              <label className="field" id={fieldId('shippingPickup')}>
                <span>
                  {t('shippingPickup')} · {t(`fieldOrigin_${draft.fields.shippingPickup.origin}`)}
                </span>
                <input
                  value={draft.fields.shippingPickup.value}
                  onChange={(event) =>
                    updateListingField(draft.site, 'shippingPickup', event.target.value)
                  }
                />
              </label>
              <label className="field" id={fieldId('tags')}>
                <span>
                  {t('tags')} · {t(`fieldOrigin_${draft.fields.tags.origin}`)}
                </span>
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
                <span>
                  {t('disclosure')} · {t(`fieldOrigin_${draft.fields.disclosure.origin}`)}
                </span>
                <textarea
                  rows={2}
                  value={draft.fields.disclosure.value}
                  onChange={(event) =>
                    updateListingField(draft.site, 'disclosure', event.target.value)
                  }
                />
              </label>

              <section className="listing-images" id={fieldId('images')} tabIndex={-1}>
                <h4>{t('imageOrderAndCover')}</h4>
                {draft.coverImageIndex !== null && images[draft.coverImageIndex] && (
                  <div className="square-cover-preview">
                    <img src={images[draft.coverImageIndex]} alt={t('squareCoverPreview')} />
                  </div>
                )}
                <ol>
                  {draft.imageOrder.map((imageIndex, position) => (
                    <li key={imageIndex}>
                      <img
                        src={images[imageIndex]}
                        alt={`${t('imageReference', { count: imageIndex + 1 })}`}
                      />
                      <span>{position + 1}</span>
                      <button
                        type="button"
                        disabled={position === 0}
                        onClick={() => moveImage(draft.site, imageIndex, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={position === draft.imageOrder.length - 1}
                        onClick={() => moveImage(draft.site, imageIndex, 1)}
                      >
                        ↓
                      </button>
                      <button type="button" onClick={() => setCoverImage(draft.site, imageIndex)}>
                        {draft.coverImageIndex === imageIndex
                          ? t('selectedCover')
                          : t('useAsCover')}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>

              <details className="listing-preview">
                <summary>{t('preview')}</summary>
                <h4>{draft.fields.title.value}</h4>
                <p>{draft.fields.description.value}</p>
                <strong>{draft.fields.priceSek.value} SEK</strong>
              </details>

              <section className="readiness-groups">
                {(
                  [
                    ['blocker', blockers],
                    ['warning', warnings],
                    ['improvement', improvements],
                  ] as const
                ).map(([severity, group]) => (
                  <div key={severity}>
                    <h4>
                      {t(`readiness_${severity}`)} ({group.length})
                    </h4>
                    <ul>
                      {group.map((issue) => (
                        <li key={issue.id}>
                          <button type="button" onClick={() => openField(draft.site, issue.field)}>
                            {issue.message}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              <small className="policy-source">
                {t('policyVersion')}: {policyMetadata.version} · {t('policyChecked')}:{' '}
                {new Date(policyMetadata.checkedAt).toLocaleDateString()} ·{' '}
                {policyMetadata.sourceUrl}
              </small>

              <div className="template-actions">
                <button
                  type="button"
                  disabled={blockers.length > 0}
                  onClick={() =>
                    void handleCopy(
                      draft.site,
                      `${draft.fields.title.value}\n\n${draft.fields.description.value}`,
                    )
                  }
                >
                  {copiedSite === draft.site ? t('copied') : t('copy')}
                </button>
                <button
                  type="button"
                  disabled={blockers.length > 0}
                  onClick={() => void handleCopy(draft.site, exportCopyBundle(draft.site))}
                >
                  {t('copyStructuredPackage')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}
