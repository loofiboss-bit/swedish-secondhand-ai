import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketplaceSite, PricingStrategy } from '@core/types';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { SectionCard } from '@shared/components/SectionCard';

const DEFAULT_SITE: MarketplaceSite = 'blocket';

export function ValuationPanel() {
  const { t } = useTranslation('common');
  const {
    loading,
    error,
    valuation,
    pricingStrategy,
    traderaComps,
    manualComps,
    setPricingStrategy,
    fetchTraderaComparables,
    addManualComparable,
    removeManualComparable,
    setComparableIncluded,
    estimateValue,
    saveToHistory,
  } = useValuationStore();
  const { stepErrors } = useWorkflowStore();

  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualSite, setManualSite] = useState<MarketplaceSite>(DEFAULT_SITE);

  const allComparables = useMemo(
    () => [...traderaComps, ...manualComps],
    [traderaComps, manualComps],
  );

  const submitManualComp = async (event: FormEvent) => {
    event.preventDefault();
    const numericPrice = Number(manualPrice);
    if (!manualTitle.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      return;
    }

    await addManualComparable({
      site: manualSite,
      title: manualTitle.trim(),
      priceSek: numericPrice,
      soldAt: new Date().toISOString(),
      conditionHint: 'User provided',
      url: '',
      similarityScore: 0.6,
      sourceQuality: 0.55,
    });

    setManualTitle('');
    setManualPrice('');
  };

  return (
    <SectionCard title={t('estimate')}>
      {(error || stepErrors.comparables || stepErrors.price) && (
        <p className="inline-warning" role="alert">
          {stepErrors.comparables || stepErrors.price || error}
        </p>
      )}

      <label className="field">
        <span>{t('pricingStrategy')}</span>
        <select
          value={pricingStrategy}
          onChange={(event) => setPricingStrategy(event.target.value as PricingStrategy)}
        >
          <option value="fast_sale">{t('strategyFastSale')}</option>
          <option value="balanced">{t('strategyBalanced')}</option>
          <option value="max_value">{t('strategyMaxValue')}</option>
        </select>
      </label>

      <div className="inline-actions">
        <button type="button" onClick={() => void fetchTraderaComparables()} disabled={loading}>
          {t('fetchTradera')}
        </button>
        <button type="button" onClick={() => void estimateValue()} disabled={loading}>
          {t('estimate')}
        </button>
        <button type="button" onClick={() => void saveToHistory()} disabled={loading}>
          {t('saveHistory')}
        </button>
      </div>

      <form className="manual-comp" onSubmit={(event) => void submitManualComp(event)}>
        <h3>{t('manualComps')}</h3>
        <input
          value={manualTitle}
          onChange={(event) => setManualTitle(event.target.value)}
          placeholder={t('title')}
        />
        <input
          value={manualPrice}
          onChange={(event) => setManualPrice(event.target.value)}
          type="number"
          min={1}
          placeholder={t('priceSek')}
        />
        <select
          value={manualSite}
          onChange={(event) => setManualSite(event.target.value as MarketplaceSite)}
        >
          <option value="blocket">Blocket</option>
          <option value="vinted">Vinted</option>
          <option value="tradera">Tradera</option>
        </select>
        <button type="submit">{t('addComp')}</button>
      </form>

      <ul className="comparable-list">
        {allComparables.map((comp) => (
          <li key={comp.id}>
            <label>
              <input
                type="checkbox"
                checked={comp.decision?.included ?? true}
                onChange={(event) => setComparableIncluded(comp.id, event.target.checked)}
              />{' '}
              [{comp.site}] {comp.title} - {Math.round(comp.priceSek)} SEK (
              {Math.round((comp.relevance?.score ?? comp.sourceQuality) * 100)}%)
            </label>
            <small>
              {comp.decision?.reason ?? t('comparablePendingReview')} — {t('weight')}:{' '}
              {(comp.relevance?.weight ?? comp.sourceQuality).toFixed(2)}
            </small>
            {comp.relevance && <small>{comp.relevance.reason}</small>}
            <input
              aria-label={`${t('comparableReason')}: ${comp.title}`}
              defaultValue={comp.decision?.reason ?? ''}
              onBlur={(event) =>
                setComparableIncluded(comp.id, comp.decision?.included ?? true, event.target.value)
              }
              placeholder={t('comparableReason')}
            />
            {comp.source === 'manual' && (
              <button type="button" onClick={() => void removeManualComparable(comp.id)}>
                {t('remove')}
              </button>
            )}
          </li>
        ))}
      </ul>

      {valuation && (
        <div className="valuation-box" aria-label={t('valuationResult')}>
          <h3>{t('valuationResult')}</h3>
          <p>
            {t('valuationStatus')}: {valuation.status}
          </p>
          {valuation.status === 'insufficient-evidence' ? (
            <p role="status">{valuation.action}</p>
          ) : (
            <>
              <p>
                {t('range')}: {valuation.priceMinSek} - {valuation.priceMaxSek} SEK
              </p>
              <p>
                {t('recommended')}: <strong>{valuation.priceRecommendedSek} SEK</strong>
              </p>
              {valuation.status === 'low-confidence' && <p role="status">{valuation.action}</p>}
            </>
          )}
          <p>
            {t('confidence')}: {Math.round(valuation.confidence * 100)}%
          </p>
          <p>
            {t('rationale')}: {valuation.rationale}
          </p>
          <ul className="confidence-breakdown">
            <li>
              {t('factorSimilarity')}: {valuation.confidenceBreakdown.similarity}
            </li>
            <li>
              {t('factorSampleSize')}: {valuation.confidenceBreakdown.sampleSize}
            </li>
            <li>
              {t('factorSourceQuality')}: {valuation.confidenceBreakdown.sourceQuality}
            </li>
            <li>
              {t('factorCalibration')}: {valuation.confidenceBreakdown.calibration}
            </li>
          </ul>
          {valuation.adjustments.length > 0 && (
            <>
              <h4>{t('visibleAdjustments')}</h4>
              <ul>
                {valuation.adjustments.map((adjustment) => (
                  <li key={adjustment.id}>
                    {adjustment.label}: {adjustment.amountSek > 0 ? '+' : ''}
                    {adjustment.amountSek} SEK — {adjustment.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
